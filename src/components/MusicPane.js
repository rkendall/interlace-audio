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
      itemLoopingStatus: {},
    }
    Howler.pool = 200
  }

  componentDidUpdate(prevProps) {
    const {squareCount, currentCompositionName, stopLooping} = this.props
    const {initialized} = this.state
    if (!initialized || currentCompositionName !== prevProps.currentCompositionName) {
      this.initializeComposition()
      this.setState({initialized: true})
    } else if (squareCount && squareCount !== prevProps.squareCount) {
      this.initializeTriggers()
    } else if (stopLooping) {
      this.loopingCounts = {}
      this.setState({
        itemLoopingStatus: {},
      })
    }
  }

  componentWillUnmount() {
    this.clearTimers()
    this.clearAudio()
  }

  render() {
    const {composition} = this.state
    const {loading, activeAudioIndex, allowDisabled, itemLoopingStatus} = this.state
    const {squareCount, fadeSquares} = this.props
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
                  isLooping: itemLoopingStatus[ind],
                  fadeSquares,
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

  itemsPlaying = {}

  // Don't put in state to avoid rerenders
  loopingCounts = {}

  playTimer = null

  endTimers = {}

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
    Object.entries(superGroupsObj).forEach((superGroup) => {
      console.log('superGroup', superGroup)
    })
    return Object.entries(superGroupsObj).reduce((groupLimits, [superGroupName, {maxActive = 10}]) => {
        return ({...groupLimits, [superGroupName]: maxActive})
      }, allGroupLimits
    )
  }

  initializeStatus =
    ({groups, maxSoundCount, maxInQueue, superGroups = {}, lengths, endOffset = 4000}) => {
      const groupLimits = this.getGroupLimits(groups, superGroups)
      console.log('groupLimits', groupLimits)
      this.audioQueue = []
      this.loopingCounts = {}
      this.itemsPlaying = {}
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
        itemLoopingStatus: {},
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

  getRandom = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    const int = Math.floor(Math.random() * (max - min + 1)) + min
    return int * .1
  }

  shuffleArray = arr => {
    for (let i = arr.length - 1; i > 0; i --){
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
    console.log('initializeTriggers')
    const {squareCount} = this.props
    const sizedItemsArray = this.getSizedAudioItemsArray(squareCount)
    const composition = sizedItemsArray.map((item, ind) => {
      return {
        ...item,
        audioIndex: ind,
      }
    })
    this.setState({
      composition,
    })
  }

  clearTimers = () => {
    clearInterval(this.playTimer)
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

  fadeAll = () => {
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

  initializeComposition = () => {
    const {rawCompositions, currentCompositionName} = this.props
    const compositionData = rawCompositions[currentCompositionName]
    this.audioItemsByRange = this.getAudioItemsByRange(compositionData.groups)
    this.audioItemsUniqueArray = this.flattenAudioItems(this.audioItemsByRange)
    this.setState({loading: true, composition: null}, () => {
      this.fadeAll()
      setTimeout(() => {
        this.audioItems = {}
        this.clearAudio()
        this.initializeStatus(compositionData)
        this.clearTimers()
        this.initializeTriggers()
        const audioLoadPromises = this.loadAllAudio()
        Promise.all(audioLoadPromises).then(() => {
          this.setPlayTimer()
          this.setState({loading: false, initialized: true})
        })
      }, 3000)
    })
  }

  clearAudio = () => {
    Howler.unload()
  }

  onTrigger = audioIndex => {
    const {composition} = this.state
    const isLooping = this.loopingCounts[audioIndex]
    if (!isLooping) {
      this.addAudioToQueue(composition[audioIndex])
    }
  }

  isAudioPlayable = ({audioIndex, group}) => {
    const {groupFullStates} = this.state
    return !groupFullStates[group] || this.loopingCounts[audioIndex]
  }

  addAudioToQueue = audioItem => {
    const {group} = audioItem
    if (this.isAudioPlayable(audioItem)) {
      this.audioQueue.push(audioItem)
      this.incrementActiveAudioCount(group)
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

  isLoopingAllowed = audioIndex => {
    if (this.isMaxActiveAudio()) {
      return false
    }
    const {itemLoopingStatus, groupLimits} = this.state
    const group = this.getGroupForAudioIndex(audioIndex)
    const loopsForGroup = Object.keys(itemLoopingStatus)
      .filter(key => this.getGroupForAudioIndex(key) === group && itemLoopingStatus[key]).length
    return loopsForGroup < groupLimits[group]
  }

  isMaxActiveAudio = () => {
    return Object.keys(this.itemsPlaying).length === this.state.maxSoundCount
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
    sound.play()
    const {lengths = {}, endOffset} = this.state
    this.setState({
      activeAudioIndex: audioIndex,
    })
    this.itemsPlaying[audioIndex] = true
    console.log('audioItem playing:', audioName)
    const audioDuration = sound.duration() * 1000
    const now = Date.now()
    const blockingDuration = lengths[group]
    const actualLength = audioDuration - endOffset
    const endTime = blockingDuration ? now + blockingDuration : now + actualLength
    const blockingOffset = blockingDuration ? actualLength - blockingDuration : 0
    this.runAudioEndTimer({audioIndex, group, endTime, blockingOffset})
  }

  runAudioEndTimer = ({audioIndex, group, endTime, blockingOffset}) => {
    this.endTimers[audioIndex] = setTimeout(() => {
      if (Date.now() >= endTime) {
        this.onAudioEnd({audioIndex, group, blockingOffset})
      } else {
        this.runAudioEndTimer({audioIndex, group, endTime, blockingOffset})
      }
    }, 500)
  }

  onAudioEnd = ({audioIndex, group, blockingOffset}) => {
    delete this.itemsPlaying[audioIndex]
    if (this.activeAudioCounts[group] > 0) {
      this.activeAudioCounts[group]--
    }
    const superGroup = this.state.superGroups[group]
    if (superGroup && this.activeAudioCounts[superGroup] > 0) {
      this.activeAudioCounts[superGroup]--
    }
    this.setGroupFullState()
    this.loopStartTimers[audioIndex] = setTimeout(() => {
      this.loopIfNecessary(audioIndex)
    }, blockingOffset)
  }

  loopIfNecessary = (audioIndex) => {
    const {composition} = this.state
    this.decrementLooping(audioIndex)
    if (this.loopingCounts[audioIndex] && composition) {
      this.addAudioToQueue(composition[audioIndex])
    }
  }

  toggleLooping = audioIndex => {
    // Number of loops allowed
    const loopStartNumber = 50
    const currentLoopCount = this.loopingCounts[audioIndex]
    let newLoopCount
    const isLooping = Boolean(currentLoopCount)
    // Don't start looping if item is not already playing
    if (!isLooping && (!this.itemsPlaying[audioIndex]
      || !this.isLoopingAllowed(audioIndex))) {
      return
    }
    const newLoopingStatus = !isLooping
    if (isLooping) {
      newLoopCount = 0
    } else {
      newLoopCount = loopStartNumber
    }
    this.setLoopingStatus(audioIndex, newLoopingStatus)
    this.loopingCounts[audioIndex] = newLoopCount
  }

  decrementLooping = audioIndex => {
    const currentLoopCount = this.loopingCounts[audioIndex]
    if (currentLoopCount) {
      const newLoopCount = currentLoopCount - 1
      this.loopingCounts[audioIndex] = newLoopCount
      if (!newLoopCount) {
        this.setLoopingStatus(audioIndex, false)
      }
    }
  }

  // Don't store loop counts in state to avoid rerenders
  setLoopingStatus = (audioIndex, status) => {
    const {itemLoopingStatus} = this.state
    if (itemLoopingStatus[audioIndex] !== Boolean(status)) {
      this.setState({
        itemLoopingStatus: {
          ...itemLoopingStatus,
          [audioIndex]: status,
        }
      })
    }
  }

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
