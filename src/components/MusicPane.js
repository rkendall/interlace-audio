import React, {Component, Fragment} from 'react'
import {Howl, Howler} from 'howler'
import ReactLoading from 'react-loading'
import debounce from 'lodash/debounce'
import './MusicPane.css'
import Trigger from './Trigger'

class PlayQueue {
  constructor({onAdd, onFire}) {
    this.values = []
    this.onAdd = onAdd
    this.onFire = onFire
  }

  add(value) {
    this.values.push(value)
    this.onAdd(value)
  }

  fire() {
    this.values.forEach(val => {
      this.onFire(val)
    })
    this.values = []
  }

  clear() {
    this.values = []
  }
}

class EndQueue extends Map {
  constructor({onFire}) {
    super()
    this.onFire = onFire
  }

  add(key, value) {
    if (!super.has(key)) {
      super.set(key, [value])
    } else {
      super.get(key).push(value)
    }
  }

  fire(key) {
    if (super.has(key)) {
      super.get(key).forEach(audioIndex => {
        // TODO only fire this if item is not looping
        this.onFire(audioIndex)
      })
      super.delete(key)
    }
  }

  clear() {
    super.clear()
  }
}

class MusicPane extends Component {
  constructor() {
    super()
    this.state = {
      initialized: false,
      loading: true,
      squareCount: null,
      composition: null,
      allowDisabled: true,
      fadeAllSquares: false,
      itemsPlaying: new Set(),
      activeAudioCounts: {},
      // Prevents too many sounds from being started at once
      maxBurstCount: null,
      itemsLooping: new Map(),
      paused: false,
    }
    this.audioItems = {}
    this.audioQueue = []
    this.audioToStop = new Map()
    this.playTimer = null
    this.allowCallTimer = null
    this.loadingTimer = null
    this.changeCompositionTimer = null
    this.loopStartTimer = null
    this.allowDisabledTimer = null
    this.nextPlayTime = 0
    this.allowCompositionChange = true
    this.allowCompositionChangeTimeout = 0
    this.startItemLooping = null
    this.stopItemLooping = null
  }

  componentDidUpdate(prevProps) {
    this.initAudioContext()
    const {squareCount, currentCompositionName, stopLooping} = this.props
    const {initialized} = this.state
    if (!initialized || currentCompositionName !== prevProps.currentCompositionName) {
      if (!initialized) {
        this.setState({initialized: true})
      }
      this.changeComposition()
    } else if (squareCount && squareCount !== prevProps.squareCount) {
      this.changeComposition()
    } else if (stopLooping) {
      this.loopingQueue.clear()
    }
  }

  componentWillUnmount() {
    this.clearTimers()
    this.clearAudio()
  }

  render() {
    const {composition, loading, allowDisabled, fadeAllSquares, itemsLooping} = this.state
    const {squareCount, vanishSquares, onPlayStarted} = this.props
    return !loading && composition && squareCount ?
      (<Fragment>
          <div className="paneWrapper" onMouseOver={this.handleInactivity} onTouchStart={onPlayStarted}>
            <div
              className="pane"
              onContextMenu={this.suppressContextMenu}
            >
              {composition.map(audioItem => {
                const {audioName, group, audioIndex} = audioItem
                const key = `${audioName}-${audioIndex}`
                const triggerProps = {
                  onTrigger: this.onTrigger,
                  onLoopToggle: this.onLoopToggle,
                  onUnclick: this.onUnclick,
                  audioIndex,
                  audioName,
                  group,
                  key,
                  disabled: !this.isAudioPlayable(audioIndex),
                  allowDisabled,
                  isPlaying: this.isItemPlaying(audioIndex),
                  isLooping: itemsLooping.has(audioIndex),
                  fadeSquares: vanishSquares,
                  fadeAllSquares,
                }
                return (
                  <Trigger {...triggerProps} />
                )
              })}
            </div>
          </div>
        </Fragment>
      ) : <div className="loading"><ReactLoading type="spinningBubbles" color="blue" delay={300}/></div>
  }

  initLoopingQueue = () => {
    let itemsLooping = new Map()
    let lastItemLooping

    const updateState = () => {
      this.setState({itemsLooping})
    }
    const canLoop = audioIndex => this.isItemPlaying(audioIndex) || this.isAudioPlayable(audioIndex)
    const isLooping = (audioIndex) => itemsLooping.has(audioIndex)

    const stop = (audioIndex) => {
      const item = itemsLooping.get(audioIndex)
      if (!item) {
        return
      }
      itemsLooping.delete(audioIndex)
      updateState()
      this.setItemAsStopped(audioIndex)
    }
    const stopLastLoopingItemIfNecessary = () => {
      const availableAudioSlots = this.getAvailableAudioSlotCount()
      if (availableAudioSlots === 0) {
        stop(lastItemLooping)
      }
    }

    const start = (audioIndex) => {
      stopLastLoopingItemIfNecessary()
      const duration = this.getAudioByIndex(audioIndex).duration
      const endTime = this.nextPlayTime + duration
      const item = {audioIndex, active: true, endTime, duration}
      itemsLooping.set(audioIndex, item)
      updateState()
      lastItemLooping = audioIndex
      this.setItemAsStarted(audioIndex)
    }

    const toggle = audioIndex => {
      if (isLooping(audioIndex)) {
        stop(audioIndex)
      } else if (canLoop(audioIndex)) {
        start(audioIndex)
      }
    }

    const fire = () => {
      if (this.state.allowDisabled) {
        if (this.startItemLooping && (this.isItemPlaying(this.startItemLooping) || this.isAudioPlayable(this.startItemLooping))) {
          start(this.startItemLooping)
          this.startItemLooping = null
        } else if (this.stopItemLooping) {
          stop(this.stopItemLooping)
          this.stopItemLooping = null
        }
      }
      itemsLooping.forEach(item => {
        const {audioIndex, endTime, duration} = item
        if (endTime === this.nextPlayTime) {
          this.playAudio(audioIndex)
          // this.setItemAsStarted(audioIndex)
          item.endTime = endTime + duration
        }
      })
    }

    const clear = () => {
      itemsLooping.forEach(({audioIndex}) => {
        this.setItemAsStopped(audioIndex)
      })
      itemsLooping = new Map()
      updateState()
    }
    const getLoopingCount = () => itemsLooping.size

    return {
      isLooping,
      toggle,
      fire,
      clear,
      getLoopingCount,
    }

  }

  playAudio = audioIndex => {
    const sound = this.getAudioByIndex(audioIndex).audio
    sound.play()
  }

  setItemAsStarted = audioIndex => {
    this.setState(({itemsPlaying, superGroups}) => {
      itemsPlaying.add(audioIndex)
      const activeAudioCounts = this.getActiveAudioCounts({itemsPlaying, superGroups})
      return {
        itemsPlaying: new Set([...itemsPlaying]),
        activeAudioCounts,
      }
    })
  }

  playQueue = new PlayQueue({onAdd: this.setItemAsStarted, onFire: this.playAudio})

  setItemAsStopped = audioIndex => {
    this.setState(({itemsPlaying, superGroups}) => {
      itemsPlaying.delete(audioIndex)
      const activeAudioCounts = this.getActiveAudioCounts({itemsPlaying, superGroups})
      return {
        itemsPlaying: new Set([...itemsPlaying]),
        activeAudioCounts
      }
    })
  }

  endQueue = new EndQueue({onFire: audioItem => {
    if (!this.loopingQueue.isLooping(audioItem)) {
      this.setItemAsStopped(audioItem)
    }
  }})

  loopingQueue = this.initLoopingQueue()

  suppressContextMenu = event => {
    event.preventDefault()
  }

  // Necessary for mobile
  initAudioContext = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume()
    }
  }

  formatAudioItems = ({group, audioNames}) => audioNames.map(audioName => ({
    audioName,
    group,
  }))

  flattenAudioItems = audioItemsByRange => Object.values(audioItemsByRange).reduce((flattenedItems, items) => [...flattenedItems, ...items], [])

  getAudioItemsByRange = groupsObj => Object.entries(groupsObj).reduce((items, [group, {instruments}]) => {
    Object.entries(instruments).forEach(([range, audioNames]) => {
      const itemsForGroup = this.formatAudioItems({group, audioNames})
      items[range].push(...itemsForGroup)
    })
    return {...items}
  }, {high: [], medium: [], low: []})

  getGroupLimits = (groupsObj, superGroupsObj) => {
    const allGroupLimits = Object.entries(groupsObj).reduce((groupLimits, [groupName, {maxActive = 10}]) => ({
      ...groupLimits,
      [groupName]: maxActive
    }), {})
    return Object.entries(superGroupsObj).reduce((groupLimits, [superGroupName, {maxActive = 10}]) => {
        return ({...groupLimits, [superGroupName]: maxActive})
      }, allGroupLimits
    )
  }

  loadAllAudio = () => {
    const audioPromises = this.audioItemsUniqueArray.map(({audioName}) => {
      return this.createAudioItem(audioName)
    })
    return audioPromises
  }

  shuffleArray = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i)
      const temp = arr[i]
      arr[i] = arr[j]
      arr[j] = temp
    }
    return arr
  }

  getCumulativeLength = audioItemsByRange => Object.values(audioItemsByRange).reduce((count, values) => count + values.length, 0)

  getSizedAudioItemsArray = squareCount => {
    const originalItems = this.audioItemsByRange
    const audioItems = {high: [], medium: [], low: []}
    let indexes = {high: 0, medium: 0, low: 0}
    while (this.getCumulativeLength(audioItems) < squareCount) {
      Object.entries(originalItems).forEach(([range, items]) => {
        if (!items.length) {
          return
        }
        const ind = indexes[range]
        indexes[range] = ind < items.length - 1 ? ind + 1 : 0
        const audioItem = items[indexes[range]]
        audioItems[range].push(audioItem)
      })
    }
    Object.entries(audioItems).forEach(([range, arr]) => {
      audioItems[range] = this.shuffleArray(arr)
    })
    const duplicatedAudioItems = this.flattenAudioItems(audioItems)
    return duplicatedAudioItems.slice(0, squareCount)
  }

  createAudioItem = audioName => {
    const {currentCompositionName} = this.props
    const loadPromise = new Promise((resolve) => {
      resolve()
    })
    if (!this.audioItems[audioName]) {
      const src = `audio/${currentCompositionName}/${audioName}.mp3`
      const audio = new Howl({
        src,
        volume: 1,
        onload: () => loadPromise,
        onloaderror: (id, error) => {
          console.error(`Error loading ${src} -- ${error}`)
        },
        onplayerror: (id, error) => {
          console.error(`Error playing ${src} -- ${error}`)
        },
      })
      this.audioItems[audioName] = {
        audio
      }
    }
    return loadPromise
  }

  initializeTriggers = () => {
    const {squareCount} = this.props
    const sizedItemsArray = this.getSizedAudioItemsArray(squareCount)
    const composition = sizedItemsArray.map((item, ind) => {
      return {
        ...item,
        audioIndex: ind,
      }
    })
    Howler.pool = composition.length
    this.setState({
      composition,
    })
  }

  clearTimers = () => {
    clearTimeout(this.changeCompositionTimer)
    clearTimeout(this.playTimer)
    clearTimeout(this.allowDisabledTimer)
    clearTimeout(this.loadingTimer)
    clearTimeout(this.loopStartTimer)
  }

  fadeAllAudio = () => {
    Object.entries(this.audioItems).forEach(([name, {audio}]) => {
      if (audio.playing()) {
        audio.once('fade', () => {
          audio.once('fade', () => {
            audio.fade(.1, 0, 500)
          })
          audio.fade(.2, .1, 1000)
        })
        audio.fade(1, .2, 1500)
      }
    })
  }

  isStillVisible = () => document.body.querySelectorAll('.trigger.visible').length

  startLoadingTimer = () => {
    this.loadingTimer = setTimeout(() => {
      if (this.isStillVisible()) {
        this.startLoadingTimer()
      } else {
        this.setState({loading: true})
      }
    }, 500)
  }

  fadeEverything = () => {
    let initTimeout = 500
    this.startLoadingTimer()
    if (this.getItemPlayingCount()) {
      this.fadeAllAudio()
      initTimeout = 3000
    } else if (this.isStillVisible()) {
      initTimeout = 1500
    }
    this.loopingQueue.clear()
    this.setState({fadeAllSquares: true})
    return initTimeout
  }

  changeCompositionUnwrapped = () => {
    let initTimeout = this.fadeEverything()
    this.changeCompositionTimer = setTimeout(() => {
      this.initializeComposition()
    }, initTimeout)
    return initTimeout
  }

  changeComposition = () => {
    if (this.allowCompositionChange) {
      this.allowCompositionChangeTimeout = this.changeCompositionUnwrapped()
    }
    this.allowCompositionChange = false
    clearTimeout(this.allowCallTimer)
    this.allowCallTimer = setTimeout(() => {
    }, this.allowCompositionChangeTimeout)
  }

  initializeComposition = () => {
    const {rawCompositions, currentCompositionName} = this.props
    const compositionData = rawCompositions[currentCompositionName]
    this.audioItemsByRange = this.getAudioItemsByRange(compositionData.groups)
    this.audioItemsUniqueArray = this.flattenAudioItems(this.audioItemsByRange)
    this.setState({composition: null, fadeAllSquares: false}, () => {
      this.audioItems = {}
      this.clearAudio()
      this.playQueue.clear()
      this.endQueue.clear()
      this.loopingQueue.clear()
      this.initializeStatus(compositionData)
      this.clearTimers()
      this.initializeTriggers()
      const audioLoadPromises = this.loadAllAudio()
      Promise.all(audioLoadPromises).then(() => {
        this.addAudioDurations()
        this.setPlayTimer()
        clearTimeout(this.loadingTimer)
        this.setState({loading: false})
        this.allowCompositionChange = true
      })
    })
  }

  initializeStatus =
    ({groups, maxSoundCount, maxBurstCount, superGroups = {}, lengths, endOffset = 3000}) => {
      const groupLimits = this.getGroupLimits(groups, superGroups)
      this.audioQueue = []
      this.initializeItemsPlaying()
      const superGroupCollection = {}
      const activeAudioCounts = {}
      Object.entries(superGroups).forEach(([superGroupName, superGroup]) => {
        activeAudioCounts[superGroupName] = 0
        superGroup.groups.forEach(groupName => {
          superGroupCollection[groupName] = superGroupName
        })
      })
      Object.keys(groupLimits).forEach(group => {
        activeAudioCounts[group] = 0
      })
      this.loopingQueue.clear()
      this.setState({
        maxSoundCount,
        maxBurstCount: maxBurstCount || maxSoundCount,
        groupLimits,
        superGroups: superGroupCollection,
        lengths,
        endOffset,
        activeAudioCounts,
      })
    }

  getDuration = audioLength => {
    const {endOffset} = this.state
    const duration = Math.round(audioLength) * 1000
    return duration - endOffset
  }

  addAudioDurations = () => {
    Object.values(this.audioItems).forEach(audioItem => {
      const {audio} = audioItem
      audio.on('load', () => {
        audioItem.duration = this.getDuration(audio.duration())
      })
      audio.load()
    })
  }

  clearAudio = () => {
    Howler.unload()
  }

  setPlayTimer = () => {
    // Determines resolution of entries (on the beat)
    this.nextPlayTime = Math.round(window.performance.now()) + 1000
    let timeout = 100
    let endTimesSet = false
    let fireDone = false
    let count = 0
    const runPlayTimer = () => {
      this.playTimer = setTimeout(() => {
        const now = window.performance.now()
        const timeUntilPlay = this.nextPlayTime - now
        timeout = 100
        if (!endTimesSet && timeUntilPlay <= 900) {
          this.endQueue.fire(this.nextPlayTime)
          endTimesSet = true
        }
        if (timeUntilPlay <= 200) {
          this.isQueueLockedForDragging = true
        }
        if (timeUntilPlay <= 100) {
          timeout = 10
        }
        if (!fireDone && timeUntilPlay <= 0) {
          timeout = 200
          this.playQueue.fire()
          this.loopingQueue.fire()
          fireDone = true
        }
        if (timeUntilPlay <= -100) {
          this.isQueueLockedForDragging = false
        }
        if (timeUntilPlay <= -200) {
          this.nextPlayTime += 1000
          endTimesSet = false
          fireDone = false
          // To prevent hanging on error
          if (!this.playQueue.length && !this.isPlayerActive()) {
            this.initializeItemsPlaying()
            this.setState({activeAudioCounts: {}})
          }
          if (this.getItemPlayingCount() === 0) {
            count += 1
          } else {
            count = 0
          }
        }
        if (count >= 20) {
          this.setState({paused: true})
        } else {
          runPlayTimer()
        }
      }, timeout)
    }

    runPlayTimer()
  }

  initializeItemsPlaying = () => {
    this.setState({itemsPlaying: new Set()})
  }

  getActiveAudioCounts = ({itemsPlaying, superGroups}) => {
    const activeAudioCounts = {}
    itemsPlaying.forEach(audioIndex => {
      const group = this.getGroupForAudioIndex(audioIndex)
      const superGroup = superGroups[group]
      activeAudioCounts[group] = activeAudioCounts[group] ? activeAudioCounts[group] += 1 : 1
      if (superGroup) {
        activeAudioCounts[superGroup] = activeAudioCounts[superGroup] ? activeAudioCounts[superGroup] += 1 : 1
      }
    })
    return activeAudioCounts
  }

  isPlayerActive = () => {
    if (!this.audioItems) {
      return false
    }
    return Object.values(this.audioItems).some(({audio}) => audio.playing())
  }

  isItemPlaying = audioIndex => this.state.itemsPlaying.has(audioIndex)

  getItemPlayingCount = () => this.state.itemsPlaying.size

  isAudioPlayable = audioIndex => {
    const group = this.getGroupForAudioIndex(audioIndex)
    return !this.isGroupFull(group) && !this.isMaxActiveAudio() && !this.isBurstBufferFull()
  }

  getGroupForAudioIndex = audioIndex => {
    const {composition} = this.state
    return composition[audioIndex].group
  }

  getAvailableAudioSlotCount = () => {
    if (this.isMaxActiveAudio()) {
      return 0
    }
    const {superGroups, activeAudioCounts, groupLimits} = this.state
    const availableSlotsForGroups = Object.entries(groupLimits).reduce((slots, [groupName, limit]) => {
      return {
        ...slots,
        [groupName]: limit - (activeAudioCounts[groupName] || 0)
      }
    }, {})
    const availableSlotCount = Object.entries(availableSlotsForGroups).reduce((count, [groupName, availableSlotsInSuperGroup]) => {
      if (!superGroups[groupName]) {
        return count + availableSlotsInSuperGroup
      } else {
        const superGroupName = groupName
        const availableSlotsForSubgroups = Object.entries(availableSlotsForGroups).reduce((slots, [name, availableSubCount]) => {
          const isGroupPartOfSuperGroup = superGroups[name] === superGroupName
          const slotsToAddFromSubGroup = isGroupPartOfSuperGroup ? availableSubCount : 0
          slots += slotsToAddFromSubGroup
          return slots
        }, 0)
        return Math.min(availableSlotsForSubgroups, availableSlotsInSuperGroup)
      }
    }, 0)
    const totalAvailable = this.state.maxSoundCount - this.getItemPlayingCount()
    return Math.min(availableSlotCount, totalAvailable)
  }

  isGroupFull = group => {
    if (this.state.activeAudioCounts[group] === this.state.groupLimits[group]) {
      return true
    }
    const superGroup = this.state.superGroups[group]
    return superGroup ? this.state.activeAudioCounts[superGroup] === this.state.groupLimits[superGroup] : false
  }

  isMaxActiveAudio = () => {
    return this.getItemPlayingCount() >= this.state.maxSoundCount
  }

  isBurstBufferFull = () => {
    const {maxBurstCount} = this.state
    return this.playQueue.length + this.loopingQueue.getLoopingCount() >= maxBurstCount
  }

  setAudioStopTimes = ({playTime, queue, stopList}) => {
    queue.forEach(audioIndex => {
      const duration = this.getAudioByIndex(audioIndex).duration
      const endTime = playTime + duration
      const itemsForTime = stopList.get(endTime) || []
      const areExistingItems = itemsForTime.length
      if (!areExistingItems) {
        itemsForTime.push(audioIndex)
      }
      stopList.set(endTime, itemsForTime)
    })
  }

  addAudioToQueue = audioIndex => {
    this.audioQueue.push(audioIndex)
    this.setItemAsStarted(audioIndex)
  }

  getAudioByIndex = audioIndex => {
    const {composition} = this.state
    const audioName = composition[audioIndex].audioName
    return this.audioItems[audioName]
  }

  startAllowDisabledTimer = () => {
    this.allowDisabledTimer = setTimeout(() => {
      this.setState({
        allowDisabled: true,
      })
      // Don't allowDisabled until secondary animation is finished
    }, 500)
  }

  // Prevent animation from being toggled too many times
  // by mouse drag
  resetAllowDisabled = debounce(() => {
    clearTimeout(this.allowDisabledTimer)
    this.startAllowDisabledTimer()
  }, 300, {leading: false, trailing: true})

  handleDisabling = isDragged => {
    if (!isDragged) {
      return
    }
    this.setState(({allowDisabled}) => {
      if (allowDisabled) {
        return {
          allowDisabled: false,
        }
      }
      return null
    })
    this.resetAllowDisabled()
  }

  getEndTime = audioIndex => {
    const duration = this.getAudioByIndex(audioIndex).duration
    return this.nextPlayTime + duration
  }

  onTrigger = ({audioIndex, isDragged}) => {
    if (!this.isBurstBufferFull() &&
      this.isAudioPlayable(audioIndex) && !this.isItemPlaying(audioIndex) && !this.loopingQueue.isLooping(audioIndex) && !(isDragged && this.isQueueLockedForDragging)
    ) {
      this.playQueue.add(audioIndex)
      this.endQueue.add(this.getEndTime(audioIndex), audioIndex)
      // this.setAudioStopTimes({playTime: this.nextPlayTime, queue: this.audioQueue, stopList: this.audioToStop})
      //
    }
    this.handleDisabling(isDragged)
  }

  onUnclick = audioIndex => {
    clearTimeout(this.loopStartTimer)
    this.startItemLooping = null
    this.stopItemLooping = null
  }

  onLoopToggle = audioIndex => {
    if (this.loopingQueue.isLooping(audioIndex)) {
      this.stopItemLooping = audioIndex
    } else {
      this.loopStartTimer = setTimeout(() => {
        this.startItemLooping = audioIndex
      }, 300)
    }
  }

  handleInactivity = () => {
    const {paused} = this.state
    if (paused) {
      this.setPlayTimer()
      this.setState({paused: false})
    }
  }
}

export default MusicPane
