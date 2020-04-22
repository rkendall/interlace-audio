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
      squareCount: null,
      composition: null,
      allowDisabled: true,
      fadeAllSquares: false,
      itemsPlaying: new Set(),
      activeAudioCounts: {},
      // Prevents too many sounds from being started at once
      maxBurstCount: null,
      loopingInd: null,
      paused: false,
    }
    this.looping = this.initializeLooping()
  }

  componentDidUpdate(prevProps) {
    this.initAudioContext()
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
    const {composition, loading, allowDisabled, fadeAllSquares, loopingInd} = this.state
    const {squareCount, vanishSquares} = this.props
    return !loading && composition && squareCount ?
      (<Fragment>
          <div className="paneWrapper" onMouseOver={this.handleInactivity}>
            <div
              className="pane"
              onContextMenu={this.suppressContextMenu}
            >
              {composition.map(audioItem => {
                const {audioName, group, audioIndex} = audioItem
                const key = `${audioName}-${audioIndex}`
                const triggerProps = {
                  onTrigger: this.onTrigger,
                  onLoopToggle: this.looping.toggle,
                  audioIndex,
                  audioName,
                  group,
                  key,
                  disabled: !this.isAudioPlayable(audioIndex),
                  allowDisabled,
                  isPlaying: this.isItemPlaying(audioIndex),
                  isLooping: loopingInd === audioIndex || this.looping.isLooping(audioIndex),
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

  audioItems = {}

  audioQueue = []

  itemsLooping = new Set()

  // loopingQueue = []

  audioToStop = new Map()

  playTimer = null

  initTimer = null

  changeCompositionTimer = null

  loopStartTimers = {}

  allowDisabledTimer = null

  burstBufferCount = 0

  nextPlayTime = 0

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
      this.setState({
        maxSoundCount,
        maxBurstCount: maxBurstCount || maxSoundCount,
        groupLimits,
        superGroups: superGroupCollection,
        lengths,
        endOffset,
        itemsLooping: new Set(),
        activeAudioCounts,
      })
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
    const {endOffset} = this.state
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
    clearTimeout(this.initTimer)
    clearTimeout(this.changeCompositionTimer)
    clearTimeout(this.playTimer)
    Object.keys(this.loopStartTimers).forEach(id => {
      clearTimeout(this.loopStartTimers[id])
    })

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
        this.addAudioDurations()
        this.setPlayTimer()
        this.setState({loading: false})
      })
    })
  }

  addAudioDurations = () => {
    const {endOffset} = this.state
    Object.values(this.audioItems).forEach(audioItem => {
      const {audio} = audioItem
      audio.on('load', () => {
        const duration = Math.round(audio.duration()) * 1000
        audioItem.duration = duration - endOffset
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
    let audioEnded = false
    let loopingRefreshed = false
    let audioPlayed = false
    let count = 0
    const runPlayTimer = () => {
      this.playTimer = setTimeout(() => {
        const now = window.performance.now()
        const timeUntilPlay = this.nextPlayTime - now
        if (timeUntilPlay > 500) {
          timeout = 200
        } else if (timeUntilPlay < 200) {
          timeout = 50
        } else if (timeUntilPlay < 50) {
          timeout = 10
        } else {
          timeout = 100
        }
        if (now >= this.nextPlayTime - 900) {
          if (!audioEnded) {
            this.onAudioEnd(this.nextPlayTime)
            audioEnded = true
          }
        }
        if (now >= this.nextPlayTime - 200) {
          if (!loopingRefreshed) {
            console.log('loopingRefreshed', loopingRefreshed)
            this.looping.refreshQueue(this.nextPlayTime)
            loopingRefreshed = true
          }
        }
        if (now >= this.nextPlayTime) {
          this.playAudioInQueue(this.nextPlayTime)
          this.looping.playItemsInQueue()
          this.nextPlayTime += 1000
          audioEnded = false
          loopingRefreshed = false
          if (this.getItemPlayingCount() === 0) {
            count += 1
          } else {
            count = 0
          }
          console.log('count', count)
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

  setItemAsStarted = audioIndex => {
    console.log('setItemAsStarted')
    this.setState(({itemsPlaying, superGroups}) => {
      itemsPlaying.add(audioIndex)
      this.incrementBurstBuffer()
      const activeAudioCounts = this.getActiveAudioCounts({itemsPlaying, superGroups})
      console.log('itemsPlaying', itemsPlaying)
      return {
        itemsPlaying: new Set([...itemsPlaying]),
        activeAudioCounts,
      }
    })
  }

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

  incrementBurstBuffer = () => {
    this.burstBufferCount += 1
  }

  isBurstBufferFull = () => {
    const {maxBurstCount} = this.state
    return this.burstBufferCount >= maxBurstCount
  }

  setAudioStopTimes = ({playTime, queue, stopList}) => {
    const {endOffset} = this.state
    console.log('queue', queue)
    queue.forEach(audioIndex => {
      const duration = this.getAudioByIndex(audioIndex).duration
      const endTime = playTime + duration
      const itemsForTime = stopList.get(endTime) || []
      const areExistingItems = itemsForTime.length
      console.log('itemsForTime', itemsForTime)
      if (!areExistingItems) {
        itemsForTime.push(audioIndex)
      }
      stopList.set(endTime, itemsForTime)
      // this.addAudioItemToStopList(endTime, audioIndex)
    })
  }

  // addAudioItemToStopList = (time, audioItem) => {
  //   const itemsForTime = this.audioToStop.get(time) || []
  //   itemsForTime.push(audioItem)
  //   this.audioToStop.set(time, itemsForTime)
  // }

  addAudioToQueue = audioIndex => {
    const {composition} = this.state
    this.audioQueue.push(audioIndex)
    // if (!this.isItemLooping(audioIndex)) {
    this.setItemAsStarted(audioIndex)
    // }
  }

  getAudioByIndex = audioIndex => {
    const {composition} = this.state
    const audioName = composition[audioIndex].audioName
    return this.audioItems[audioName]
  }

  playAudioInQueue = (playTime) => {
    this.audioQueue.forEach(audioIndex => {
      this.playAudio(audioIndex)
    })
    this.setAudioStopTimes({playTime, queue: this.audioQueue, stopList: this.audioToStop})
    this.audioQueue = []
    this.burstBufferCount = 0
  }

  playAudio = audioIndex => {
    const sound = this.getAudioByIndex(audioIndex).audio
    sound.play()
  }

  onAudioEnd = (playTime) => {
    this.looping.onEnd(playTime)
    const itemsToEnd = this.audioToStop.get(playTime)
    if (!itemsToEnd) {
      return
    }
    itemsToEnd.forEach(audioIndex => {
      this.setItemAsStopped(audioIndex)
      this.audioToStop.delete(playTime)
    })
  }

  initializeLooping = () => {
    const itemsByEndTime = new Map()
    let queue = []

    const setEndTime = audioIndex => {
      console.log('setEndTime', audioIndex)
      this.setAudioStopTimes({playTime: this.nextPlayTime - 1000, queue: [audioIndex], stopList: itemsByEndTime})
    }

    const getItemsByEndTime = endTime => {
      const items = itemsByEndTime.get(endTime) || []
      if (items) {
        itemsByEndTime.delete(endTime)
      }
      return items
    }
    const refreshQueue = endTime => {
      queue = getItemsByEndTime(endTime)
      return queue
    }
    const getItems = () => this.itemsLooping
    const isLooping = audioIndex => getItems().has(audioIndex)
    const start = audioIndex => {
      this.setState(({itemsPlaying}) => {
        this.itemsLooping.add(audioIndex)
        itemsPlaying.delete(audioIndex)
        return {itemsPlaying, loopingInd: audioIndex}
      })
      setEndTime(audioIndex)
    }
    const stop = audioIndex => {
        getItems().delete(audioIndex)
      this.setState({loopingInd: null})
    }
    const toggle = audioIndex => {
      if (isLooping(audioIndex)) {
        stop(audioIndex)
      } else if (isAllowed(audioIndex)) {
        start(audioIndex)
      }
    }
    const onEnd = (playTime) => {
      console.log('itemsbyendtime', itemsByEndTime)
      const itemsToContinue = getItemsByEndTime(playTime)
      itemsToContinue.forEach(audioIndex => {
            setEndTime(audioIndex)
      })
    }

    const isAllowed = audioIndex => !this.isItemPlaying(audioIndex) || this.isAudioPlayable(audioIndex)
    const playItemsInQueue = () => {
      console.log('play queue', queue)
      queue.forEach(audioIndex => {
        this.playAudio(audioIndex)
        setEndTime(audioIndex)
      })
    }
    // const clear = () => {
    //   this.setState(({itemsLooping}) => {
    //     itemsLooping.clear
    //     return {itemsLooping}
    //   })
    // }
    return {
      toggle,
      refreshQueue,
      isLooping,
      onEnd,
      playItemsInQueue,
    }
  }

  // isItemLooping = audioIndex => this.state.itemsLooping.has(audioIndex)
  //
  // addAudioToLoopingQueue = () => {
  //   const {composition} = this.state
  //   this.loopingQueue.forEach(audioIndex => {
  //     if (composition && this.isItemLooping(audioIndex)) {
  //       // console.log('item from looping', audioIndex, composition, composition[audioIndex])
  //       this.addAudioToQueue(audioIndex)
  //     }
  //   })
  //   this.loopingQueue = []
  // }

  // onLoopToggle = audioIndex => {
  //   console.log('toggleLooping', audioIndex)
  //   if (!this.isItemPlaying(audioIndex) && !this.isAudioPlayable(audioIndex)) {
  //     console.log('toggleLooping ignored', audioIndex)
  //     return
  //   }
  //   console.log('toggleLooping set', audioIndex)
  //   const {itemsLooping} = this.state
  //   const isLooping = itemsLooping.has(audioIndex)
  //   this.setLoopingStatus(audioIndex, !isLooping)
  // }
  //
  // stopLastLoopingItemIfNecessary = itemsLooping => {
  //   const availableAudioSlots = this.getAvailableAudioSlotCount()
  //   console.log('availableAudioSlots', availableAudioSlots)
  //   if (availableAudioSlots === 0) {
  //     const lastLoopingItem = Array.from(itemsLooping)[itemsLooping.size - 1]
  //     itemsLooping.delete(lastLoopingItem)
  //   }
  // }
  //
  // setLoopingStatus = (audioIndex, startLooping) => {
  //   this.setState(({itemsLooping}) => {
  //     const newItemsLooping = new Set(itemsLooping)
  //     if (startLooping) {
  //       this.stopLastLoopingItemIfNecessary(newItemsLooping)
  //       newItemsLooping.add(audioIndex)
  //     } else {
  //       newItemsLooping.delete(audioIndex)
  //     }
  //     return {itemsLooping: newItemsLooping}
  //   })
  // }

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

  onTrigger = ({audioIndex,isDragged}) => {
    if (!this.isBurstBufferFull() && this.isAudioPlayable(audioIndex) && !this.isItemPlaying(audioIndex) && !this.looping.isLooping(audioIndex)) {
      this.addAudioToQueue(audioIndex)
    }
    this.handleDisabling(isDragged)
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
