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
      allowDisabled : true,
      itemLoopingStatus: {},
    }
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
      console.log('stop looping')
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
    const {loading, activeAudioIndex, allowDisabled, itemLoopingStatus } = this.state
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

  getAudioItems = () => {
    const { squareCount } = this.props
    const audioItems = []

  }

  initializeStatus =
    ({audioItems, maxSoundCount, maxInQueue, groupLimits, superGroups = {}, lengths, endOffset = 3000}) => {
      this.audioQueue = []
      this.loopingCounts = {}
      this.itemsPlaying = {}
      const superGroupCollection = {}
      const groupFullStates = {}
      audioItems.forEach(item => {
        const group = item[1]
        if (!groupFullStates[group]) {
          groupFullStates[group] = false
        }
      })
      Object.keys(superGroups).forEach(superGroup => {
        superGroups[superGroup].forEach(group => {
          this.activeAudioCounts[superGroup] = 0
          superGroupCollection[group] = superGroup
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

  loadAllAudio = currentCompositionName => {
    const {rawCompositions} = this.props
    const audioPromises = rawCompositions[currentCompositionName].audioItems.map(item => {
      const audioName = item[0]
      return this.getAudioBuffer(audioName)
    })
    return audioPromises
  }

  initializeTriggers = () => {
    const {rawCompositions, squareCount, currentCompositionName} = this.props
    const audioItems = rawCompositions[currentCompositionName].audioItems
    let duplicatedAudioItems = audioItems
    while (duplicatedAudioItems.length < squareCount) {
      duplicatedAudioItems = duplicatedAudioItems.concat(audioItems)
    }
    const sizedItemsArray = duplicatedAudioItems.slice(0, squareCount)
    const composition = sizedItemsArray.map((item, ind) => {
      return {
        audioName: item[0],
        audioIndex: ind,
        group: item[1],
      }
    })
    this.setState({
      composition,
    })
  }

  clearTimers = () => {
    clearInterval(this.playTimer)
    Object.keys(this.endTimers).forEach(id => {clearTimeout(this.endTimers[id])})
    Object.keys(this.loopStartTimers).forEach(id => {clearTimeout(this.loopStartTimers[id])})

  }

  initializeComposition = () => {
    this.setState({loading: true}, () => {
      Object.keys(this.audioItems).forEach(name => {
        const item = this.audioItems[name]
        if (item.playing()) {
          item.fade(0.4, 0, 1500)
        }
      })
      setTimeout(() => {
        this.audioItems = {}
        const {rawCompositions, currentCompositionName} = this.props
        this.clearAudio()
        this.initializeStatus(rawCompositions[currentCompositionName])
        this.clearTimers()
        this.initializeTriggers()
        const audioLoadPromises = this.loadAllAudio(currentCompositionName)
        Promise.all(audioLoadPromises).then(() => {
          this.playTimer = setInterval(this.playAudioInQueue, 500)
          this.setState({loading: false, initialized: true})
        })
      }, 1500)
    })
  }

  clearAudio = () => {
    Howler.unload()
  }

  onTrigger = audioIndex => {
    const { composition } = this.state
    const isLooping = this.loopingCounts[audioIndex]
    if (!isLooping) {
      this.addAudioToQueue(composition[audioIndex])
    }
  }

  isAudioPlayable = ({audioIndex, group}) => {
    const { groupFullStates } = this.state
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
    const { composition } = this.state
    return composition[audioIndex].group
  }

  setGroupFullState = () => {
    const { groupFullStates } = this.state
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
    const { itemLoopingStatus, groupLimits } = this.state
    const group = this.getGroupForAudioIndex(audioIndex)
    const loopsForGroup = Object.keys(itemLoopingStatus)
      .filter(key => this.getGroupForAudioIndex(key) === group && itemLoopingStatus[key]).length
    console.log('ind', audioIndex, 'group', group, 'itemLoopingStatus', itemLoopingStatus, 'loopsForGroup', loopsForGroup, 'groupLimits', groupLimits)
    return loopsForGroup < groupLimits[group]
  }

  isMaxActiveAudio = () => {
    return Object.keys(this.itemsPlaying).length === this.state.maxSoundCount
  }

  isQueueFull = () => {
    const { maxInQueue } = this.state
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
        volume: 0.4,
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
    const {lengths = {}, endOffset} = this.state
    this.setState({
      activeAudioIndex: audioIndex,
    })
    const sound = this.audioItems[audioName]
    sound.play()
    this.itemsPlaying[audioIndex] = true
    console.log('playaudio this.itemsPlaying[audioIndex]', this.itemsPlaying[audioIndex], audioIndex)
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
    const { composition } = this.state
    this.decrementLooping(audioIndex)
    if (this.loopingCounts[audioIndex]) {
      this.addAudioToQueue(composition[audioIndex])
    }
  }

  toggleLooping = audioIndex => {
    const loopStartNumber = 6
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
    console.log('new isLooping and count', newLoopingStatus, newLoopCount)
  }

  decrementLooping = audioIndex => {
    const currentLoopCount = this.loopingCounts[audioIndex]
    if (currentLoopCount) {
      const newLoopCount = currentLoopCount - 1
      this.loopingCounts[audioIndex] = newLoopCount
      if(!newLoopCount) {
        this.setLoopingStatus(audioIndex, false)
      }
    }
  }

  // Don't store loop counts in state to avoid rerenders
  setLoopingStatus = (audioIndex, status) => {
    const { itemLoopingStatus } = this.state
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
    const { allowDisabled } = this.state
    if (allowDisabled) {
      this.setState({
        allowDisabled: false,
      })
    }
    this.resetAllowDisabled()
  }

}

export default MusicPane
