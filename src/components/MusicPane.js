import React, { Component, Fragment } from 'react'
import classNames from 'classnames'
import { Howl, Howler } from 'howler'
import ReactLoading from 'react-loading'
import debounce from 'lodash/debounce'
import memoize from 'lodash/memoize'
import osc from 'osc/dist/osc-browser'
import './MusicPane.scss'
import Trigger from './Trigger'
import poetry from '../poetry'
import { shuffleArray } from '../utilities'
import mode from '../mode'
import AudioManager from '../audioManagement/audioManager'

class MusicPane extends Component {
  constructor() {
    super()
    // this.state = {
    //   initialized: false,
    //   loading: true,
    //   allowDisabled: true,
    //   fadeAllSquares: false,
    //   // Prevents too many sounds from being started at once
    //   maxBurstCount: null,
    //   paused: false,
    //   // forces rerender when items are started or stopped
    //   itemsPlayingCount: 0,
    //   isPoetry: false,
    //   activeIndex: null,
    // }
    this.manager = new AudioManager(this.props)
    // this.manager.composition = []
    // this.manager.playTimer = null
    // this.manager.allowCallTimer = null
    // this.manager.loadingTimer = null
    // this.manager.changeCompositionTimer = null
    // this.manager.loopStartTimer = null
    // this.manager.allowDisabledTimer = null
    // this.manager.nextPlayTime = 0
    // this.manager.allowCompositionChange = true
    // this.manager.allowCompositionChangeTimeout = 0
    // this.manager.itemsPlaying = new Set()
    // this.manager.superGroups = {}
    // this.manager.activeAudioCounts = {}
    // this.manager.playQueue = new Set()
    // this.manager.itemsLooping = new Set()
    // this.manager.lastItemLooping = null
    // this.manager.lastPointerId = null
    // this.manager.relatedItems = new Map()
  }

  componentDidMount() {
    this.manager.mounted = true
    this.manager.updateProps(this.props)
    this.manager.parentSetState = this.setState.bind(this)
    if (mode === 'application') {
      return
    }
    this.manager.initAudioContext()
    var oscPort = new osc.WebSocketPort({
      url: 'ws://localhost:3000', // URL to your Web Socket server.
      metadata: true
    });
    oscPort.open();
    oscPort.on('message', (oscMsg) => {
      const { address, args } = oscMsg
      if (address.startsWith('/lx/modulation/Angles/')) {
        this.manager.handleInactivity()
        const rawValue = args?.[0]?.value
        const value = Math.round(rawValue * 100)
        const rangeInd = Number(address.slice(-1))
        // console.log('oscMsg!', value, rangeInd);
        this.manager.manageInput({ value, rangeInd })
      }
    });
  }

  componentDidUpdate(prevProps) {
    this.manager.updateProps(this.props)
    if (mode === 'application') {
      this.manager.initAudioContext()
    }
    const { squareCount, currentCompositionName, stopLooping } = this.props
    const { initialized } = this.manager.state
    if (!initialized || currentCompositionName !== prevProps.currentCompositionName) {
      if (!initialized) {
        this.manager.setState({ initialized: true })
      }
      this.manager.changeComposition()
    } else if (squareCount && squareCount !== prevProps.squareCount) {
      this.manager.changeComposition()
    } else if (stopLooping) {
      this.manager.stopAllLooping()
    }
  }

  componentWillUnmount() {
    this.manager.clearTimers()
    this.manager.clearAudio()
    this.manager.mounted = false
  }

  render() {
    const { loading, allowDisabled, fadeAllSquares, isPoetry, initialized, activeIndex } = this.manager.state
    const { squareCount, showAllSquares, vanishSquares, onPlayStarted, showPoetry } = this.props
    return !loading && this.manager.composition.length && squareCount ?
      (<div className="paneWrapper" onMouseOver={this.manager.handleInactivity} onTouchStart={onPlayStarted}>
        <div
          className={classNames('pane', { installation: mode === 'installation' })}
          onContextMenu={this.manager.suppressContextMenu}
        >
          {this.manager.composition.map(audioItem => {
            const { audioName, group, audioIndex } = audioItem
            const key = `${audioName}-${audioIndex}`
            const triggerProps = {
              activeIndex,
              setActiveIndex: this.manager.setActiveIndex,
              onTrigger: this.manager.onTrigger,
              onLoopToggle: this.manager.onLoopToggle,
              onUnclick: this.manager.onUnclick,
              audioIndex,
              audioName,
              group,
              key,
              disabled: !this.manager.isAudioPlayable(audioIndex),
              allowDisabled,
              isPlaying: this.manager.isItemPlaying(audioIndex),
              isLooping: this.manager.itemsLooping.has(audioIndex),
              fadeSquares: vanishSquares,
              fadeAllSquares,
              showAllSquares,
              isPoetry: isPoetry && showPoetry,
            }
            return (
              <Trigger {...triggerProps} />
            )
          })}
        </div>
      </div>
      ) : initialized &&
      <div className="loading" onTouchStart={onPlayStarted}><ReactLoading type="spinningBubbles" color="blue" delay={300} /></div>
  }

}

export default MusicPane
