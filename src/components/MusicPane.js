import React, {Component, Fragment} from 'react'
import {Howl, Howler} from 'howler'
import ReactLoading from 'react-loading'
import debounce from 'lodash/debounce'
import memoize from 'lodash/memoize'
import './MusicPane.css'
import Trigger from './Trigger'
import poetry from '../poetry'
import {shuffleArray} from '../utilities'

class MusicPane extends Component {
  constructor() {
    super()
    this.state = {
      initialized: false,
      loading: true,
      allowDisabled: true,
      fadeAllSquares: false,
      // Prevents too many sounds from being started at once
      maxBurstCount: null,
      paused: false,
      // forces rerender when items are started or stopped
      itemsPlayingCount: 0,
      isPoetry: false,
    }
    this.composition = []
    this.playTimer = null
    this.allowCallTimer = null
    this.loadingTimer = null
    this.changeCompositionTimer = null
    this.loopStartTimer = null
    this.allowDisabledTimer = null
    this.nextPlayTime = 0
    this.allowCompositionChange = true
    this.allowCompositionChangeTimeout = 0
    this.itemsPlaying = new Set()
    this.superGroups = {}
    this.activeAudioCounts = {}
    this.playQueue = new Set()
    this.itemsLooping = new Set()
    this.lastItemLooping = null
    this.lastPointerId = null
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
      this.itemsLooping.clear()
    }
    console.log('state', this.state)
  }

  componentWillUnmount() {
    this.clearTimers()
    this.clearAudio()
  }

  render() {
    const {loading, allowDisabled, fadeAllSquares, isPoetry, initialized} = this.state
    const {squareCount, vanishSquares, onPlayStarted, showPoetry} = this.props
    return !loading && this.composition.length && squareCount ?
      (<Fragment>
          <div className="paneWrapper" onMouseOver={this.handleInactivity} onTouchStart={onPlayStarted}>
            <div
              className="pane"
              onContextMenu={this.suppressContextMenu}
            >
              {this.composition.map(audioItem => {
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
                  isLooping: this.itemsLooping.has(audioIndex),
                  fadeSquares: vanishSquares,
                  fadeAllSquares,
                  isPoetry: isPoetry && showPoetry,
                }
                return (
                  <Trigger {...triggerProps} />
                )
              })}
            </div>
          </div>
        </Fragment>
      ) : initialized && <div className="loading" onTouchStart={onPlayStarted}><ReactLoading type="spinningBubbles" color="blue" delay={300}/></div>
  }

  stopLastLoopingItemIfNecessary = audioIndex => {
    if (this.itemsLooping.size <= this.state.maxSoundCount - 1) {
      return
    }
    this.stopItemLooping(this.lastItemLooping)
  }

  startItemLooping = audioIndex => {
    this.itemsLooping.add(audioIndex)
    if (!this.isItemPlaying(audioIndex)) {
      this.itemsPlaying.add(audioIndex)
      this.playQueue.add(audioIndex)
    }
    this.stopLastLoopingItemIfNecessary(audioIndex)
    this.incrementAudioCount()
    this.lastItemLooping = audioIndex
  }

  stopItemLooping = audioIndex => {
    this.itemsLooping.delete(audioIndex)
    this.incrementAudioCount()
  }

  playAudio = audioIndex => {
    const sound = this.composition[audioIndex].audio
    if (sound) {
      // console.log('playing', this.composition[audioIndex].audioName)
      const audioId = sound.play()
      this.composition[audioIndex].audioId = audioId
    }
  }

  setItemAsStarted = audioIndex => {
    if (this.isBurstLimitReached()) {
      return
    }
    this.itemsPlaying.add(audioIndex)
    this.playQueue.add(audioIndex)
    this.incrementAudioCount()
  }

  suppressContextMenu = event => {
    if (process.env.NODE_ENV === 'production') {
      event.preventDefault()
    }
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
    const audioPromises = this.composition.map((item, ind) => {
      return this.createAudioItem(ind)
    })
    return audioPromises
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
      audioItems[range] = shuffleArray(arr)
    })
    const duplicatedAudioItems = this.flattenAudioItems(audioItems)
    return duplicatedAudioItems.slice(0, squareCount)
  }

  createAudioItem = audioInd => {
    const {currentCompositionName} = this.props
    const loadPromise = new Promise((resolve, reject) => {
      const audioName = this.composition[audioInd].audioName
      const src = `audio/${currentCompositionName}/${audioName}.mp3`
      const audio = new Howl({
        src,
        volume: 1,
        onload: () => {
          this.composition[audioInd].end = Math.round(audio.duration()) - (this.state.endOffset / 1000)
          resolve()
        },
        onloaderror: (id, error) => {
          console.error(`Error loading ${src} -- ${error}`)
          this.composition[audioInd].audio = {play: noOp, seek: noOp, playing: noOp, once: noOp, fade: noOp}
          this.composition[audioInd].duration = 0
          reject(audioInd)
        },
        onplayerror: (id, error) => {
          console.error(`Error playing ${src} -- ${error}`)
        },
      })
      const noOp = () => {}
      this.composition[audioInd].audio = audio
    })
    return loadPromise
  }

  initializeTriggers = () => {
    const {squareCount} = this.props
    const sizedItemsArray = this.getSizedAudioItemsArray(squareCount)
    this.composition = sizedItemsArray.map((item, ind) => {
      return {
        ...item,
        audioIndex: ind,
      }
    })
    Howler.pool = this.composition.length
  }

  clearTimers = () => {
    clearTimeout(this.changeCompositionTimer)
    clearTimeout(this.playTimer)
    clearTimeout(this.allowDisabledTimer)
    clearTimeout(this.loadingTimer)
    clearTimeout(this.loopStartTimer)
  }

  fadeAllAudio = () => {
    this.composition.forEach(({audio}) => {
      if (audio && audio.playing()) {
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
    this.itemsPlaying.clear()
    this.itemsLooping.clear()
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
      this.allowCompositionChange = true
    }, this.allowCompositionChangeTimeout)
  }

  initializeComposition = () => {
    const {rawCompositions, currentCompositionName} = this.props
    const compositionData = rawCompositions[currentCompositionName]
    this.audioItemsByRange = this.getAudioItemsByRange(compositionData.groups)
    const isPoetry = poetry.init(compositionData.poem)
    this.setState({fadeAllSquares: false, isPoetry, loading: true}, () => {
      this.composition = []
      this.clearAudio()
      this.itemsPlaying.clear()
      this.itemsLooping.clear()
      this.initializeStatus(compositionData)
      this.clearTimers()
      this.initializeTriggers()
      const audioLoadPromises = this.loadAllAudio()
      Promise.allSettled(audioLoadPromises).then(() => {
        this.setPlayTimer()
        clearTimeout(this.loadingTimer)
        this.setState({loading: false})
        this.allowCompositionChange = true
      })
    })
  }

  initializeStatus =
    ({groups, maxSoundCount, maxBurstCount, superGroups = {}, endOffset = 3000}) => {
      const groupLimits = this.getGroupLimits(groups, superGroups)
      this.audioQueue = []
      this.initializeItemsPlaying()
      this.playQueue = new Set()
      const superGroupCollection = {}
      this.activeAudioCounts = {}
      this.superGroupContent = {}
      Object.entries(superGroups).forEach(([superGroupName, superGroup]) => {
        this.superGroupContent[superGroupName] = []
        superGroup.groups.forEach(groupName => {
          if (!superGroupCollection[groupName]) {
            superGroupCollection[groupName] = []
          }
          superGroupCollection[groupName].push(superGroupName)
          this.superGroupContent[superGroupName].push(groupName)
        })
      })
      this.itemsPlaying.clear()
      this.itemsLooping.clear()
      this.superGroups = superGroupCollection
      this.setState({
        maxSoundCount,
        maxBurstCount: maxBurstCount || maxSoundCount,
        groupLimits,
        endOffset,
      })
    }

  clearAudio = () => {
    Howler.unload()
  }

  updateFinishedAudio = () => {
    this.itemsPlaying.forEach(audioIndex => {
      const {audio, end, audioId} = this.composition[audioIndex]
      if (!audio) {
        this.itemsPlaying.delete(audioIndex)
        this.itemsLooping.delete(audioIndex)
        return
      }
      const rawPosition = audio.seek(null, audioId) || null
      const position = Math.ceil(rawPosition)
      if (typeof position !== 'number' || position >= end) {
        if (this.itemsLooping.has(audioIndex)) {
          this.playQueue.add(audioIndex)
        } else {
          this.itemsPlaying.delete(audioIndex)
          this.incrementAudioCount()
        }
      }
    })
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
          endTimesSet = true
          this.updateFinishedAudio()
        }
        if (timeUntilPlay <= 200) {
          this.isQueueLockedForDragging = true
        }
        if (timeUntilPlay <= 100) {
          timeout = 10
        }
        if (!fireDone && timeUntilPlay <= 0) {
          this.playQueue.forEach(audioIndex => {
            this.playAudio(audioIndex)
          })
          this.playQueue.clear()
          fireDone = true
          timeout = 200
        }
        if (timeUntilPlay <= -100) {
          this.isQueueLockedForDragging = false
        }
        if (timeUntilPlay <= -200) {
          this.nextPlayTime += 1000
          endTimesSet = false
          fireDone = false
          // As a safeguard
          if (!this.isPlayerActive()) {
            this.itemsPlaying.clear()
            this.itemsLooping.clear()
            this.incrementAudioCount()
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
    this.itemsPlaying = new Set()
  }

  // To force rerender
  incrementAudioCount = () => {
    this.setState(({itemsPlayingCount}) => {
      return {itemsPlayingCount: itemsPlayingCount += 1}
    })
  }

  isBurstLimitReached = () => this.playQueue.size >= this.state.maxBurstCount

  isPlayerActive = () => {
    return this.composition.some(({audio}) => audio && audio.playing())
  }

  isItemPlaying = audioIndex => this.itemsPlaying.has(audioIndex)

  isInstrumentPlaying = audioIndex => {
    let isPlaying = false
    const instrumentName = this.composition[audioIndex].audioName
    this.itemsPlaying.forEach(itemInd => {
      if (this.composition[itemInd].audioName === instrumentName) {
        isPlaying = true
      }
    })
    return isPlaying
  }

  getItemPlayingCount = () => this.itemsPlaying.size

  isAudioPlayable = audioIndex => {
    if (this.isItemPlaying(audioIndex) || this.isMaxActiveAudio() || this.isInstrumentPlaying(audioIndex)) {
      return false
    }
    const group = this.getGroupForAudioIndex(audioIndex)
    return !this.isGroupDisabled(group)
  }

  getGroupForAudioIndex = audioIndex => {
    return this.composition[audioIndex].group
  }

  getGroupActiveCount = groupToCheck => this.composition.filter(({audioIndex, group}) => group === groupToCheck && this.isItemPlaying(audioIndex)).length

  getActiveSuperGroupCount = superGroup => this.superGroupContent[superGroup].reduce((count, groupName) => count + this.getGroupActiveCount(groupName), 0)

  isGroupFull = groupToCheck => {
    const groupCount = this.getGroupActiveCount(groupToCheck)
    return groupCount >= this.state.groupLimits[groupToCheck]
  }

  isSuperGroupFull = superGroup => {
    const superGroupCount = this.getActiveSuperGroupCount(superGroup)
    return superGroupCount >= this.state.groupLimits[superGroup]
  }

  isGroupDisabledBase = ({group, itemsPlayingCount}) => {
    if (this.isGroupFull(group)) {
      return true
    }
    const superGroups = this.superGroups[group]
    if (superGroups) {
      return superGroups.some(superGroup => this.isSuperGroupFull(superGroup))
    }
    return false
  }

  isGroupDisabledMemoized = memoize(this.isGroupDisabledBase)

  isGroupDisabled = group =>
    this.isGroupDisabledMemoized({group, itemsPlayingCount: this.state.itemsPlayingCount})

  isMaxActiveAudio = () => {
    return this.getItemPlayingCount() >= this.state.maxSoundCount
  }

  getAudioByIndex = audioIndex => {
    return this.composition[audioIndex].audio
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

  onTrigger = ({audioIndex, isMouseDragged, pointerId}) => {
    const isDragged = pointerId ? pointerId === this.lastPointerId : isMouseDragged
    if (this.isAudioPlayable(audioIndex) && !(isDragged && this.isQueueLockedForDragging)
    ) {
      this.setItemAsStarted(audioIndex)
    }
    this.handleDisabling(isDragged)
    this.lastPointerId = pointerId
    return {
      isDragged
    }
  }

  onUnclick = audioIndex => {
    clearTimeout(this.loopStartTimer)
  }

  startLoopHandler = audioIndex => {
    if (this.isAudioPlayable(audioIndex) || this.isItemPlaying(audioIndex)) {
      this.startItemLooping(audioIndex)
    }
  }

  onLoopToggle = (audioIndex) => {
    if (this.itemsLooping.has(audioIndex)) {
      this.stopItemLooping(audioIndex)
    } else {
      this.loopStartTimer = setTimeout(() => {
        this.startLoopHandler(audioIndex)
      }, 400)
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
