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
    }
  }

  componentDidUpdate(prevProps) {
    const {squareCount, currentCompositionName} = this.props
    const {initialized} = this.state
    if (!initialized || currentCompositionName !== prevProps.currentCompositionName) {
      this.initializeComposition()
      this.setState({initialized: true})
    } else if (squareCount && squareCount !== prevProps.squareCount) {
      this.initializeTriggers()
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer)
    this.clearAudio()
  }

  render() {
    const {composition} = this.state
    const {loading, activeAudioIndex, allowDisabled} = this.state
    const {squareCount, fadeSquares} = this.props
    return !loading && composition && squareCount ?
      (<Fragment>
          <div className="paneWrapper">
            <div
              className="pane"
              onContextMenu={this.suppressContextMenu}
            >
              {composition.map(({audioName, group}, ind) => {
                const key = `${audioName}-${ind}`
                const triggerProps = {
                  onTrigger: this.onTrigger,
                  audioIndex: ind,
                  audioName,
                  group,
                  key,
                  disabled: allowDisabled && !this.isAudioPlayable(group),
                  play: activeAudioIndex === ind,
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

  timer = null

  suppressContextMenu = event => {
    event.preventDefault()
  }

  initializeStatus =
    ({audioItems, maxSoundCount, maxInQueue, groupLimits, superGroups = {}, lengths, endOffset = 3000}) => {
      this.activeAudioCounts = {
        _all: 0,
      }
      this.audioQueue = []
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

  initializeComposition = () => {
    this.setState({loading: true}, () => {
      clearInterval(this.timer)
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
        this.initializeTriggers()
        const audioLoadPromises = this.loadAllAudio(currentCompositionName)
        Promise.all(audioLoadPromises).then(() => {
          this.timer = setInterval(this.playAudioInQueue, 500)
          this.setState({loading: false, initialized: true})
        })
      }, 1500)
    })
  }

  clearAudio = () => {
    Howler.unload()
  }

  onTrigger = audioIndex => {
    this.addAudioToQueue(this.state.composition[audioIndex])
  }

  isAudioPlayable = group => {
    const {maxInQueue, groupFullStates} = this.state
    return !groupFullStates[group]
  }

  addAudioToQueue = audioItem => {
    const {group} = audioItem
    if (this.isAudioPlayable(group)) {
      this.audioQueue.push(audioItem)
      this.incrementActiveAudioCount(group)
    }
  }

  incrementActiveAudioCount = group => {
    const superGroup = this.state.superGroups[group]
    this.activeAudioCounts._all++
    this.activeAudioCounts[group]++
    if (superGroup) {
      this.activeAudioCounts[superGroup]++
    }
    this.setGroupFullState()
  }

  setGroupFullState = () => {
    const { groupFullStates, maxInQueue } = this.state
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

  isMaxActiveAudio = () => {
    return this.activeAudioCounts._all === this.state.maxSoundCount
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
    const audioDuration = sound.duration() * 1000
    const now = Date.now()
    const effectiveLength = lengths[group]
    const endTime = effectiveLength ? now + effectiveLength : now + audioDuration - endOffset
    const endTimer = setInterval(() => {
      if (Date.now() >= endTime) {
        this.onAudioEnd(group)
        clearInterval(endTimer)
      }
    }, 500)
  }

  onAudioEnd = group => {
    if (this.activeAudioCounts._all > 0) {
      this.activeAudioCounts._all--
    }
    if (this.activeAudioCounts[group] > 0) {
      this.activeAudioCounts[group]--
    }
    const superGroup = this.state.superGroups[group]
    if (superGroup && this.activeAudioCounts[superGroup] > 0) {
      this.activeAudioCounts[superGroup]--
    }
    this.setGroupFullState()
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
