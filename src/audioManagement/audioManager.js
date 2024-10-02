// import React, {Component, Fragment} from 'react'
import { Howl, Howler } from 'howler'
// import ReactLoading from 'react-loading'
import debounce from 'lodash/debounce'
import memoize from 'lodash/memoize'
// import osc from 'osc/dist/osc-browser'
import '../components/MusicPane'
// import Trigger from './Trigger'
import poetry from '../poetry'
import { getSizedAudioItemsArray } from './helpers'
import mode from '../mode'
import config from '../config'

const { fastSpeedThreshold, loudnessThreshold, activityResistance, inactivityThreshold, preferredDurationForActivity, durationThreshold, instrumentFilterThreshold } = config

const isInstallation = mode === 'installation'

class AudioManager {
    constructor(props) {
        this.props = props
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
            activeIndex: null,
        }
        this.parentSetState = () => { }
        this.setState = (values, callback) => {
            if (!this.mounted) {
                return
            }
            const newValues = typeof values === 'function' ? values(this.state) : values
            this.state = { ...this.state, ...newValues }
            if (callback) {
                callback()
            }
            this.parentSetState(newValues)
        }
        this.updateProps = values => {
            this.props = { ...this.props, ...values }
        }
        this.mounted = false
        this.composition = []
        this.audioCategories = {}
        this.playTimer = null
        this.activityTimer = null
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
        this.relatedItems = new Map()
        this.ensembleSections = {}
        this.lastPlayed = { high: null, medium: null, low: null }
    }

    getIsLoud = audioIndex => /bra|drums/i.test(this.getGroupForAudioIndex(audioIndex))

    getRandomIntInclusive = (min, max) => {
        const minCeiled = Math.ceil(min);
        const maxFloored = Math.floor(max);
        return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled)
    }

    randomlySelectItem = arr => {
        if (!arr.length) {
            return null
        }
        const ind = this.getRandomIntInclusive(0, arr.length - 1)
        return arr[ind]
    }

    manageInput = ({ value, rangeInd }) => {
        const ranges = ['low', 'medium', 'high']
        const range = ranges[rangeInd - 1]
        const playStatusForRange = this.playStatus[range]
        const direction = value > 50 ? 'right' : 'left'
        let startDirection = null
        if (!playStatusForRange.startDirection) {
            startDirection = direction
            playStatusForRange.startDirection = startDirection
        } else {
            startDirection = playStatusForRange.startDirection
        }
        const speed = playStatusForRange.speed
        playStatusForRange.activity += 1
        playStatusForRange.speedBuffer += 1
        const activity = playStatusForRange.activity
        const activityLevel = Math.ceil(activity / activityResistance)
        const maxAllowed = speed < fastSpeedThreshold ? 1 : activityLevel
        const itemsPlayingInRange = this.getRangeActiveCount(range)
        if (itemsPlayingInRange >= maxAllowed) {
            return
        }
        const allowLoud = maxAllowed >= loudnessThreshold
        const playableIndexesInRange = this.audioCategories[range].filter(audioIndex => {
            if (!allowLoud && this.getIsLoud(audioIndex || this.lastPlayed[range] === audioIndex)) {
                return false
            }
            return this.isAudioPlayable(audioIndex)
        })
        // console.debug('---------------')
        // console.debug('---------------')
        // console.debug('range', range)
        // console.debug('direction', direction)
        // console.debug('startDirection', startDirection)
        // console.debug('activity', activity)
        // console.debug('activityLevel', activityLevel)
        // console.debug('speed', speed)
        // console.debug('speed', speed)
        // console.debug('maxAllowed', maxAllowed)
        // console.debug('allowLoud', allowLoud)

        // Use instruments assigned to direction of initial wheel movement until the specified amount of activity has occurred
        const directionToUse = activityLevel < durationThreshold ? startDirection : direction
        const filteredForGroup = playableIndexesInRange.filter(audioInd => [directionToUse, 'both'].includes(this.groupsForDirection[audioInd]))

        const filteredForDuration = maxAllowed <= instrumentFilterThreshold ? filteredForGroup.filter(audioInd => this.relativeDurations[audioInd] === preferredDurationForActivity) : filteredForGroup
        const selectedIndexes = filteredForDuration.length ? filteredForDuration : playableIndexesInRange
        const audioItemToPlay = this.randomlySelectItem(selectedIndexes)
        if (!audioItemToPlay) {
            return
        }
        // console.debug('isLoud', this.getIsLoud(audioItemToPlay))
        // console.debug('name', this.composition[audioItemToPlay].audioName)
        this.lastPlayed[range] = audioItemToPlay
        this.setActiveIndex(audioItemToPlay)
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

    setActiveIndex = newIndex => {
        if (!newIndex) {
            this.setState({ activeIndex: null })
        } else {
            this.setState(({ activeIndex }) =>
                activeIndex !== newIndex ? { activeIndex: newIndex } : null
            )
        }
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
        if (this.props.smartLooping) {
            const values = this.relatedItems.get(this.composition[audioIndex].key)
            values.active = true
        }
        this.stopLastLoopingItemIfNecessary(audioIndex)
        this.incrementAudioCount()
        this.lastItemLooping = audioIndex
    }

    stopItemLooping = audioIndex => {
        const { smartLooping } = this.props
        this.itemsLooping.delete(audioIndex)
        if (smartLooping) {
            this.resetRelatedItems(audioIndex)
        }
        this.incrementAudioCount()
    }

    stopAllLooping = () => {
        if (this.props.smartLooping) {
            this.itemsLooping.forEach(audioIndex => {
                this.resetRelatedItems(audioIndex)
            })
        }
        this.itemsLooping.clear()
    }

    playAudio = audioIndex => {
        const audioItem = this.composition[audioIndex]
        const sound = audioItem.audio
        if (sound) {
            // console.debug('playing relativeDuration', this.composition[audioIndex].audioName)
            // console.debug('relativeDuration', this.composition[audioIndex].relativeDuration)
            const audioId = sound.play()
            audioItem.audioId = audioId
            audioItem.terminationHandled = false
        }
    }

    setItemAsStarted = audioIndex => {
        const { allowDisabled } = this.state
        if (!allowDisabled && this.isBurstLimitReached()) {
            return
        }
        this.itemsPlaying.add(audioIndex)
        this.playQueue.add(audioIndex)
        this.incrementAudioCount()
    }

    suppressContextMenu = event => {
        if (process.env.NODE_ENV === 'production' && !isInstallation) {
            event.preventDefault()
        }
    }

    // Necessary for mobile
    initAudioContext = () => {
        if (isInstallation) {
            Howler.autoSuspend = false
        }
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume()
        }
    }

    formatAudioItems = ({ group, range, audioNames }) => audioNames.map(audioName => ({
        audioName,
        group,
        range,
    }))

    getAudioItemsByRange = groupsObj => Object.entries(groupsObj).reduce((items, [group, { instruments }]) => {
        Object.entries(instruments).forEach(([range, audioNames]) => {
            const itemsForGroup = this.formatAudioItems({ group, range, audioNames })
            items[range].push(...itemsForGroup)
        })
        return { ...items }
    }, { high: [], medium: [], low: [] })

    getGroupLimits = (groupsObj, superGroupsObj) => {
        const allGroupLimits = Object.entries(groupsObj).reduce((groupLimits, [groupName, { maxActive = 10 }]) => ({
            ...groupLimits,
            [groupName]: maxActive
        }), {})
        return Object.entries(superGroupsObj).reduce((groupLimits, [superGroupName, { maxActive = 10 }]) => {
            return ({ ...groupLimits, [superGroupName]: maxActive })
        }, allGroupLimits
        )
    }

    loadAllAudio = () => {
        const audioPromises = this.composition.map((item, ind) => {
            return this.createAudioItem(ind)
        })
        return audioPromises
    }

    createAudioItem = audioInd => {
        const { currentCompositionName } = this.props
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
                    this.composition[audioInd].audio = { play: noOp, seek: noOp, playing: noOp, once: noOp, fade: noOp }
                    this.composition[audioInd].duration = 0
                    reject(audioInd)
                },
                onplayerror: (id, error) => {
                    console.error(`Error playing ${src} -- ${error}`)
                },
            })
            const noOp = () => {
            }
            this.composition[audioInd].audio = audio
        })
        return loadPromise
    }

    initializeTriggers = () => {
        const { squareCount } = this.props
        const { audioItems: sizedItemsArray, audioCategories } = getSizedAudioItemsArray({ squareCount, audioItemsByRange: this.audioItemsByRange })
        this.audioCategories = audioCategories
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
        clearTimeout(this.activityTimer)
        clearTimeout(this.allowDisabledTimer)
        clearTimeout(this.loadingTimer)
        clearTimeout(this.loopStartTimer)
    }

    fadeAllAudio = () => {
        this.composition.forEach(({ audio }) => {
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
                this.setState({ loading: true })
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
        this.setState({ fadeAllSquares: true })
        return initTimeout
    }

    addRelativeDurations = () => {
        this.relativeDurations = {}
        this.composition.forEach(item => {
            const { audioIndex, end } = item
            const relativeDuration = end <= 4 ? 'short' : 'long'
            this.relativeDurations[audioIndex] = relativeDuration
            item.relativeDuration = relativeDuration
        })

    }

    doTagsMatchString = ({ tags, str }) => tags.some(tag => str.toLowerCase().includes(tag))


    addGroupsForDirection = () => {
        const tags = {
            left: ['str', 'pia', 'guitar', 'glass', 'voice'],
            right: ['win', 'per', 'tuned', 'plucked', 'pizz'],
            both: ['bra', 'drums']
        }
        this.groupsForDirection = {}
        this.composition.forEach(item => {
            const { group, audioIndex } = item

            const direction = Object.entries(tags).find(([, values]) => this.doTagsMatchString({ tags: values, str: group }))[0]
            this.groupsForDirection[audioIndex] = direction
        })
    }

    initializeComposition = () => {
        const { rawCompositions, currentCompositionName } = this.props
        this.playStatus = {
            high: { activity: 0, speedBuffer: 0, speed: 0, startDirection: null },
            medium: { activity: 0, speedBuffer: 0, speed: 0, startDirection: null },
            low: { activity: 0, speedBuffer: 0, speed: 0, startDirection: null }
        }
        const compositionData = rawCompositions[currentCompositionName]
        this.audioItemsByRange = this.getAudioItemsByRange(compositionData.groups)
        const isPoetry = poetry.init(compositionData.poem)
        this.setState({ fadeAllSquares: false, isPoetry, loading: true }, () => {
            this.composition = []
            this.clearAudio()
            this.itemsPlaying.clear()
            this.itemsLooping.clear()
            this.relatedItems.clear()
            this.initializeStatus(compositionData)
            this.clearTimers()
            this.isGroupDisabledMemoized.cache.clear()
            this.initializeTriggers()
            this.addGroupsForDirection()
            const audioLoadPromises = this.loadAllAudio()
            this.addRelatedItemsForLooping()
            Promise.allSettled(audioLoadPromises).then(() => {
                this.addRelativeDurations()
                this.setPlayTimer()
                this.setActivityTimer()
                clearTimeout(this.loadingTimer)
                this.setState({ loading: false })
                this.allowCompositionChange = true
            })
            // console.debug('this.groupsForDirection', this.groupsForDirection)
        })
    }

    initializeStatus =
        ({ groups, maxSoundCount, maxBurstCount, superGroups = {}, endOffset = 3000 }) => {
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
                defaultMaxSoundCount: maxSoundCount,
                maxSoundCount,
                maxBurstCount: maxBurstCount || maxSoundCount,
                groupLimits,
                endOffset,
            })
        }

    clearAudio = () => {
        Howler.unload()
    }

    isSmartLooping = audioIndex => {
        if (!this.props.smartLooping) {
            return false
        }
        const relatedValues = this.relatedItems.get(this.composition[audioIndex].key)
        return Boolean(relatedValues.active)
    }

    getBaseName = audioName => audioName.replace(/ ?\d+\w*$/, '')

    getRelatedItemKey = ({ audioName, group }) => {
        const instrument = this.getBaseName(audioName)
        const groupName = this.getBaseName(group)
        return `${instrument}|${groupName}`
    }

    resetRelatedItems = audioIndex => {
        const key = this.composition[audioIndex].key
        const values = this.relatedItems.get(key)
        values.items = null
        values.active = false
    }

    addAsRelatedItem = audioItem => {
        const { audioName, audioIndex, key } = audioItem
        const values = this.relatedItems.get(key)
        if (!values.sourceItems.find(({ name }) => name === audioName)) {
            values.sourceItems.push({ name: audioName, ind: audioIndex })
        }
    }

    addRelatedItemsForLooping = () => {
        this.composition.forEach(audioItem => {
            const key = this.getRelatedItemKey(audioItem)
            audioItem.key = key
            let values = this.relatedItems.get(key)
            if (!values) {
                values = { sourceItems: [], items: null, active: false }
                this.relatedItems.set(key, values)
            }
        })
        this.composition.forEach(audioItem => {
            this.addAsRelatedItem(audioItem)
        })
    }

    getRandomIndex = ({ items, audioName }) => {
        if (items.length === 1) {
            return 0
        }
        let ind = Math.floor(Math.random() * items.length)
        const itemToLoop = items[ind]
        if (itemToLoop.name === audioName) {
            const newItems = [...items]
            newItems.splice(ind, 1)
            ind = this.getRandomIndex({ items: newItems, audioName })
        }
        return ind
    }

    getRelatedItemToLoop = audioIndex => {
        const { audioName, key } = this.composition[audioIndex]
        const values = this.relatedItems.get(key)
        let { items, sourceItems } = values
        if (!items) {
            // Use selected square for smart looping
            const itemForCurrentInstrument = sourceItems.find(item => item.name === this.composition[audioIndex].audioName)
            itemForCurrentInstrument.ind = audioIndex
            // Update by reference
            items = [...sourceItems]
            values.items = items
        } else if (!items.length) {
            items.push(...sourceItems)
        }
        const ind = this.getRandomIndex({ items, audioName })
        const itemToLoopInd = items[ind].ind
        items.splice(ind, 1)
        return itemToLoopInd
    }

    updateFinishedAudio = () => {
        this.itemsPlaying.forEach(audioIndex => {
            const { audio, end, audioId, terminationHandled } = this.composition[audioIndex]
            if (!audio) {
                this.itemsPlaying.delete(audioIndex)
                this.itemsLooping.delete(audioIndex)
                return
            }
            const rawPosition = audio.seek(null, audioId) || null
            const position = Math.ceil(rawPosition)
            if (typeof position !== 'number' || (position >= end && !terminationHandled)) {
                if (this.itemsLooping.has(audioIndex)) {
                    if (this.props.smartLooping) {
                        const relatedAudioIndex = this.getRelatedItemToLoop(audioIndex)
                        if (relatedAudioIndex === audioIndex) {
                            this.playQueue.add(audioIndex)
                            return
                        }
                        const relatedItem = this.composition[relatedAudioIndex]
                        // To prevent it from being immediately looped again,
                        // which causes infinite loop
                        if (relatedItem.audio.playing(relatedItem.audioId)) {
                            this.composition[relatedAudioIndex].terminationHandled = true
                        }
                        this.itemsLooping.delete(audioIndex)
                        this.itemsPlaying.delete(audioIndex)
                        this.itemsLooping.add(relatedAudioIndex)
                        this.playQueue.add(relatedAudioIndex)
                        this.itemsPlaying.add(relatedAudioIndex)
                        this.incrementAudioCount()
                        return
                    }
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
                    this.setState({ paused: true })
                    this.onInactivity()
                } else {
                    runPlayTimer()
                }
            }, timeout)
        }

        runPlayTimer()
    }

    setActivityTimer = () => {
        let timeout = 1000
        const activityDecrement = 10
        const runActivityTimer = () => {
            this.activityTimer = setTimeout(() => {
                Object.entries(this.playStatus).forEach(([range, { activity }]) => {
                    const speed = this.playStatus[range].speedBuffer
                    this.playStatus[range].speedBuffer = 0
                    this.playStatus[range].speed = speed
                    const newActivity = speed < inactivityThreshold ? 0 : Math.max(activity - activityDecrement, 0)
                    if (!newActivity) {
                        this.playStatus[range].startDirection = null
                        this.lastPlayed[range] = null
                    }
                    this.playStatus[range].activity = newActivity
                    // this.playStatus[range].maxAllowed = Math.max(Math.ceil(newActivity / 50), 1)
                })
                runActivityTimer()
            }, timeout)
            // console.debug('activity high', this.playStatus.high.activity)
            // console.debug('speed high', this.playStatus.high.speed)
            // console.debug('speedBuffer high', this.playStatus.high.speedBuffer)
            // console.debug('activity medium', this.playStatus.medium.activity)
            // console.debug('speed medium', this.playStatus.medium.speed)
            // console.debug('speedBuffer medium', this.playStatus.medium.speedBuffer)
            // console.debug('activity low', this.playStatus.low.activity)
            // console.debug('speed low', this.playStatus.low.speed)
            // console.debug('speedBuffer low', this.playStatus.low.speedBuffer)
            // console.debug('------------')
        }

        runActivityTimer()
    }

    onInactivity = () => {
        this.isGroupDisabledMemoized.cache.clear()
    }

    initializeItemsPlaying = () => {
        this.itemsPlaying = new Set()
    }

    // To force rerender
    incrementAudioCount = () => {
        this.setState(({ itemsPlayingCount }) => {
            return { itemsPlayingCount: itemsPlayingCount += 1 }
        })
    }

    isBurstLimitReached = () => this.playQueue.size >= this.state.maxBurstCount

    isPlayerActive = () => {
        return this.composition.some(({ audio }) => audio && audio.playing())
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
        if (!audioIndex) {
            return false
        }
        if (this.isItemPlaying(audioIndex) || this.isMaxActiveAudio() || this.isInstrumentPlaying(audioIndex)) {
            return false
        }
        const group = this.getGroupForAudioIndex(audioIndex)
        return !this.isGroupDisabled(group)
    }

    getGroupForAudioIndex = audioIndex => {
        return this.composition[audioIndex]?.group || ''
    }

    getGroupActiveCount = groupToCheck => this.composition.filter(({ audioIndex, group }) => group === groupToCheck && this.isItemPlaying(audioIndex)).length

    getActiveSuperGroupCount = superGroup => this.superGroupContent[superGroup].reduce((count, groupName) => count + this.getGroupActiveCount(groupName), 0)

    getRangeActiveCount = rangeToCheck => this.composition.filter(({ audioIndex, range }) => range === rangeToCheck && this.isItemPlaying(audioIndex)).length

    isGroupFull = groupToCheck => {
        const groupCount = this.getGroupActiveCount(groupToCheck)
        return groupCount >= this.state.groupLimits[groupToCheck]
    }

    isSuperGroupFull = superGroup => {
        const superGroupCount = this.getActiveSuperGroupCount(superGroup)
        return superGroupCount >= this.state.groupLimits[superGroup]
    }

    isGroupDisabledBase = ({ group, itemsPlayingCount }) => {
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
        this.isGroupDisabledMemoized({ group, itemsPlayingCount: this.state.itemsPlayingCount })

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
    }, 300, { leading: false, trailing: true })

    handleDisabling = isDragged => {
        if (!isDragged) {
            return
        }
        this.setState(({ allowDisabled }) => {
            if (allowDisabled) {
                return {
                    allowDisabled: false,
                }
            }
            return null
        })
        this.resetAllowDisabled()
    }

    onTrigger = ({ audioIndex, isMouseDragged, pointerId }) => {
        if (isInstallation) {
            if (this.isAudioPlayable(audioIndex)) {
                this.setItemAsStarted(audioIndex)
            }
            return {
                isDragged: false
            }
        }
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
        if (!this.isAudioPlayable(audioIndex) && !this.isItemPlaying(audioIndex)) {
            return
        }
        if (this.isSmartLooping(audioIndex)) {
            return
        }
        this.startItemLooping(audioIndex)
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
        const { paused } = this.state
        if (paused) {
            this.setPlayTimer()
            this.setState({ paused: false })
        }
    }
}

export default AudioManager