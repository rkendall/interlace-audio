import React, {Component, Fragment} from 'react'
import {Howl, Howler} from 'howler'
import ReactLoading from 'react-loading'
import debounce from 'lodash/debounce'
import './MusicPane.css'
import Trigger from './Trigger'

class MusicPane extends Component {
  constructor() {
    super()
    this.state = {
      initialized: false,
      loading: true,
      activeAudioIndex: null,
      squareCount: null,
      composition: null,
      groupFullStates: {},
      allowDisabled: true,
      itemsLooping: new Set(),
      fadeAllSquares: false,
      itemsPlaying: new Set(),
    }
  }

  componentDidUpdate(prevProps) {
    const {squareCount, currentCompositionName, stopLooping} = this.props
    const {initialized} = this.state
    if (!initialized || currentCompositionName !== prevProps.currentCompositionName) {
      this.setState({initialized: true})
      this.changeComposition()
    } else if (squareCount && squareCount !== prevProps.squareCount) {
      this.changeComposition()
    } else if (stopLooping) {
      this.setState({
        itemsLooping: new Set(),
      })
    }
  }

  componentWillUnmount() {
    this.clearTimers()
    this.clearAudio()
  }

  render() {
    const {composition} = this.state
    const {loading, activeAudioIndex, allowDisabled, itemsLooping, fadeAllSquares, itemsPlaying} = this.state
    const {squareCount, vanishSquares} = this.props
    return !loading && composition && squareCount ?
      (<Fragment>
          <div className="paneWrapper">
            <div
              className="pane"
              onContextMenu={this.suppressContextMenu}
            >
              {composition.map((audioItem, ind) => {
                const {audioName, group} = audioItem
                const key = `${audioName}-${ind}`
                const triggerProps = {
                  onTrigger: this.onTrigger,
                  onLoopToggle: this.toggleLooping,
                  audioIndex: ind,
                  audioName,
                  group,
                  key,
                  disabled: allowDisabled && !this.isAudioPlayable(audioItem),
                  play: activeAudioIndex === ind,
                  isPlaying: itemsPlaying.has(ind),
                  isLooping: itemsLooping.has(ind),
                  fadeSquares: vanishSquares,
                  fadeAllSquares,
                  onSelect: this.onSelect,
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

  audioItems = {}

  audioQueue = []

  activeAudioCounts = {}

  playTimer = null

  endTimers = {}

  initTimer = null

  changeCompositionTimer = null

  loopStartTimers = {}

  suppressContextMenu = event => {
    event.preventDefault()
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

  initializeStatus =
    ({groups, maxSoundCount, maxInQueue, superGroups = {}, lengths, endOffset = 3000}) => {
      const groupLimits = this.getGroupLimits(groups, superGroups)
      this.audioQueue = []
      this.initializeItemsPlaying()
      const superGroupCollection = {}
      const groupFullStates = {}
      this.audioItemsUniqueArray.forEach(({group}) => {
        if (!groupFullStates[group]) {
          groupFullStates[group] = false
        }
      })
      Object.entries(superGroups).forEach(([superGroupName, superGroup]) => {
        this.activeAudioCounts[superGroupName] = 0
        superGroup.groups.forEach(groupName => {
          superGroupCollection[groupName] = superGroupName
        })
      })
      this.setState({
        maxSoundCount,
        maxInQueue: maxInQueue || maxSoundCount,
        groupLimits,
        groupFullStates,
        superGroups: superGroupCollection,
        lengths,
        endOffset,
        itemsLooping: new Set(),
      })
      Object.keys(groupLimits).forEach(group => {
        this.activeAudioCounts[group] = 0
      })
    }

  loadAllAudio = () => {
    const audioPromises = this.audioItemsUniqueArray.map(({audioName}) => {
      return this.getAudioBuffer(audioName)
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
    clearTimeout(this.initTimer)
    clearTimeout(this.changeCompositionTimer)
    clearTimeout(this.playTimer)
    Object.keys(this.endTimers).forEach(id => {
      clearTimeout(this.endTimers[id])
    })
    Object.keys(this.loopStartTimers).forEach(id => {
      clearTimeout(this.loopStartTimers[id])
    })

  }

  setPlayTimer = () => {
    // Determines resolution of entries (on the beat)
    let nextPlayTime = window.performance.now() + 1000
    const runPlayTimer = () => {
      this.playTimer = setTimeout(() => {
        const now = window.performance.now()
        if (now >= nextPlayTime) {
          nextPlayTime += 1000
          this.playAudioInQueue()
        }
        runPlayTimer()
      }, 50)
    }
    runPlayTimer()
  }

  fadeAllAudio = () => {
    Object.entries(this.audioItems).forEach(([name, item]) => {
      if (item.playing()) {
        item.once('fade', () => {
          item.once('fade', () => {
            item.fade(.1, 0, 500)
          })
          item.fade(.2, .1, 1000)
        })
        item.fade(1, .2, 1500)
      }
    })
  }

  fadeEverything = () => {
    let initTimeout = 0
    if (this.getItemPlayingCount()) {
      this.fadeAllAudio()
      initTimeout = 3000
    } else if (document.body.querySelectorAll('.trigger.visible').length) {
      initTimeout = 1500
    }
    this.setState({fadeAllSquares: true, itemsLooping: new Set()})
    return initTimeout
  }

  changeComposition = () => {
    let initTimeout = this.fadeEverything()
    this.changeCompositionTimer = setTimeout(() => {
      this.initializeComposition()
    }, initTimeout)
  }

  initializeComposition = () => {
    clearTimeout(this.initTimer)
    const {rawCompositions, currentCompositionName} = this.props
    const compositionData = rawCompositions[currentCompositionName]
    this.audioItemsByRange = this.getAudioItemsByRange(compositionData.groups)
    this.audioItemsUniqueArray = this.flattenAudioItems(this.audioItemsByRange)
    this.setState({loading: true, composition: null, fadeAllSquares: false}, () => {
      this.audioItems = {}
      this.clearAudio()
      this.initializeStatus(compositionData)
      this.clearTimers()
      this.initializeTriggers()
      const audioLoadPromises = this.loadAllAudio()
      Promise.all(audioLoadPromises).then(() => {
        this.setPlayTimer()
        this.setState({loading: false})
      })
    })
  }

  clearAudio = () => {
    Howler.unload()
  }

  onTrigger = audioIndex => {
    const {composition, itemsLooping} = this.state
    const isLooping = itemsLooping.has(audioIndex)
    if (!isLooping) {
      this.addAudioToQueue(composition[audioIndex])
    }
  }

  initializeItemsPlaying = () => {
    this.setState({itemsPlaying: new Set()})
  }

  setItemAsStarted = audioIndex => {
    this.setState(({itemsPlaying}) => {
      itemsPlaying.add(audioIndex)
      return {itemsPlaying: new Set([...itemsPlaying])}
    })
  }

  setItemAsStopped = audioIndex => {
    this.setState(({itemsPlaying}) => {
      itemsPlaying.delete(audioIndex)
      return {itemsPlaying: new Set([...itemsPlaying])}
    })
  }

  isItemPlaying = audioIndex => Boolean(this.state.itemsPlaying.has(audioIndex))

  getItemPlayingCount = () => this.state.itemsPlaying.size

  isAudioPlayable = ({audioIndex, group}) => {
    const {groupFullStates, itemsLooping} = this.state
    return (!this.isItemPlaying(audioIndex) && !groupFullStates[group]) || itemsLooping.has(audioIndex)
  }

  addAudioToQueue = audioItem => {
    const {group, audioIndex} = audioItem
    if (this.isAudioPlayable(audioItem)) {
      const {itemsLooping} = this.state
      this.audioQueue.push(audioItem)
      if (!itemsLooping.has(audioIndex)) {
        this.setItemAsStarted(audioIndex)
        this.incrementActiveAudioCount(group)
      }
    }
  }

  incrementActiveAudioCount = group => {
    const superGroup = this.state.superGroups[group]
    this.activeAudioCounts[group]++
    if (superGroup) {
      this.activeAudioCounts[superGroup]++
    }
    this.setGroupFullState()
  }

  getGroupForAudioIndex = audioIndex => {
    const {composition} = this.state
    return composition[audioIndex].group
  }

  setGroupFullState = () => {
    const {groupFullStates} = this.state
    const newStates = {}
    const isAllFull = this.isMaxActiveAudio() || this.isQueueFull()
    Object.keys(groupFullStates).forEach(group => {
      const isFull = isAllFull || this.isGroupFull(group)
      console.log('group, isfull', group, isFull)
      if (groupFullStates[group] !== isFull) {
        newStates[group] = isFull
      }
    })
    if (Object.keys(newStates).length) {
      this.setState({
        groupFullStates: {
          ...groupFullStates,
          ...newStates,
        }
      })
    }
  }

  isGroupFull = group => {
    const superGroup = this.state.superGroups[group]
    return this.activeAudioCounts[group] === this.state.groupLimits[group] ||
      (Boolean(superGroup) && this.activeAudioCounts[superGroup] === this.state.groupLimits[superGroup])
  }

  isMaxActiveAudio = () => {
    return this.getItemPlayingCount() >= this.state.maxSoundCount
  }

  isQueueFull = () => {
    const {maxInQueue} = this.state
    return this.audioQueue.length >= maxInQueue
  }

  getAudioBuffer = audioName => {
    const {currentCompositionName} = this.props
    const loadPromise = new Promise((resolve) => {
      resolve()
    })
    if (!this.audioItems[audioName]) {
      const src = `audio/${currentCompositionName}/${audioName}.mp3`
      this.audioItems[audioName] = new Howl({
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
    }
    return loadPromise
  }

  playAudioInQueue = () => {
    this.audioQueue.forEach(audioItem => {
      this.playAudio(audioItem)
    })
    this.audioQueue = []
  }

  playAudio = ({audioName, audioIndex, group}) => {
    const sound = this.audioItems[audioName]
    const id = sound.play()
    const {lengths = {}, endOffset} = this.state
    this.setState({
      activeAudioIndex: audioIndex,
    })
    console.log('audioItem playing:', audioName)
    const audioDuration = sound.duration() * 1000
    const now = Date.now()
    // const blockingDuration = lengths[group]
    const actualLength = audioDuration - endOffset
    // const endTime = blockingDuration ? now + blockingDuration : now + actualLength
    const endTime = now + actualLength
    // const blockingOffset = blockingDuration ? actualLength - blockingDuration : 0
    // this.runAudioEndTimer({audioIndex, group, endTime, blockingOffset})
    this.runAudioEndTimer({audioIndex, group, endTime, actualLength})
  }

  runAudioEndTimer = ({audioIndex, group, endTime, actualLength}) => {
    this.endTimers[audioIndex] = setTimeout(() => {
      if (Date.now() >= endTime - 500) {
        this.onAudioEnd({audioIndex, group, actualLength})
      } else {
        this.runAudioEndTimer({audioIndex, group, endTime, actualLength})
      }
    }, 100)
  }

  onAudioEnd = ({audioIndex, group, actualLength}) => {
    const {composition} = this.state
    const loopItem = this.shouldLoop(audioIndex)
    if (loopItem) {
      this.addAudioToQueue(composition[audioIndex])
      return
    }
    this.setItemAsStopped(audioIndex)
    if (this.activeAudioCounts[group] > 0) {
      this.activeAudioCounts[group]--
    }
    const superGroup = this.state.superGroups[group]
    if (superGroup && this.activeAudioCounts[superGroup] > 0) {
      this.activeAudioCounts[superGroup]--
    }
    this.setGroupFullState()
  }

  shouldLoop = (audioIndex) => {
    const {composition, itemsLooping} = this.state
    return itemsLooping.has(audioIndex) && composition
  }

  isLoopingAllowed = audioIndex => {
    return true
    const {itemsLooping, groupLimits} = this.state
    const group = this.getGroupForAudioIndex(audioIndex)
    const loopsForGroup = Array.from(itemsLooping)
      .filter(audioIndex => this.getGroupForAudioIndex(audioIndex) === group && itemsLooping.has(audioIndex))
      .length
    return loopsForGroup < groupLimits[group]
  }

  toggleLooping = audioIndex => {
    const {itemsLooping} = this.state
    const isLooping = itemsLooping.has(audioIndex)
    // Don't start looping if item is not already playing
    if (!isLooping && (!this.isItemPlaying(audioIndex)
      || !this.isLoopingAllowed(audioIndex))) {
      return
    }
    this.setLoopingStatus(audioIndex, !isLooping)
  }

  stopLastLoopingItemIfNecessary = itemsLooping => {
    const {maxSoundCount} = this.state
    if (itemsLooping.size === this.state.maxSoundCount - 1) {
      const lastLoopingItem = Array.from(itemsLooping)[itemsLooping.size - 1]
      itemsLooping.delete(lastLoopingItem)
    }
  }

  setLoopingStatus = (audioIndex, status) => {
    this.setState(({itemsLooping}) => {
      if (itemsLooping.has(audioIndex) === status) {
        return null
      }
      const newItemsLooping = new Set(itemsLooping)
      if (status) {
        this.stopLastLoopingItemIfNecessary(newItemsLooping)
        newItemsLooping.add(audioIndex)
      } else {
        newItemsLooping.delete(audioIndex)
      }
      return {itemsLooping: newItemsLooping}
    })
  }

  // Prevent animation from being toggled too many times
  // by mouse drag
  resetAllowDisabled = debounce(() => {
    this.setState({
      allowDisabled: true,
    })
  }, 300, {leading: false, trailing: true})

  onSelect = () => {
    const {allowDisabled} = this.state
    if (allowDisabled) {
      this.setState({
        allowDisabled: false,
      })
    }
    this.resetAllowDisabled()
  }

}

export default MusicPane
