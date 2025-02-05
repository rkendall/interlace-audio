import React, { Component, Fragment } from 'react'
import classNames from 'classnames'
import ReactLoading from 'react-loading'
import osc from 'osc/dist/osc-browser'
import './MusicPane.scss'
import Trigger from './Trigger'
import mode from '../mode'
import AudioManager from '../audioManagement/audioManager'

const isInstallation = mode === 'installation'

class MusicPane extends Component {
  constructor() {
    super()
    this.manager = new AudioManager(this.props)
    // this.lastReceived = { 1: null, 2: null, 3: null }
  }

  componentDidMount() {
    this.manager.mounted = true
    this.manager.updateProps(this.props)
    this.manager.parentSetState = this.setState.bind(this)
    if (!isInstallation) {
      return
    }
    this.manager.initAudioContext()
    var oscPort = new osc.WebSocketPort({
      url: 'ws://localhost:3000', // URL to your Web Socket server.
      metadata: true,
    })
    oscPort.on('message', (oscMsg) => {
      try {
        this.manager.manageInput(oscMsg)
      } catch (error) {
        console.error('Error processing OSC message', error)
      }
      // const { address, args } = oscMsg
      // if (address.startsWith('/lx/modulation/Angles/')) {
      //   const time = performance.now()
      //   const value = args?.[0]?.value
      //   const rangeInd = Number(address.slice(-1))
      //   if (value === this.lastReceived[rangeInd]) {
      //     return
      //   }
      //   this.lastReceived[rangeInd] = value
      //   // console.log('oscMsg!', value, rangeInd);
      //   this.manager.manageInput({ value, rangeInd, time })
      // }
    })
    oscPort.on('error', (error) => {
      console.error('OSC error', error)
    })
    oscPort.open()
  }

  componentDidUpdate(prevProps) {
    this.manager.updateProps(this.props)
    if (!isInstallation) {
      this.manager.initAudioContext()
    }
    const { squareCount, currentCompositionName, stopLooping } = this.props
    const { initialized } = this.manager.state
    if (
      !initialized ||
      currentCompositionName !== prevProps.currentCompositionName
    ) {
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
    performance.removeEventListener(
      "resourcetimingbufferfull",
      this.manager.clearPerformanceBuffer)

  }

  render() {
    const {
      loading,
      allowDisabled,
      fadeAllSquares,
      isPoetry,
      initialized,
      activeIndex,
    } = this.manager.state
    const {
      squareCount,
      showAllSquares,
      vanishSquares,
      onPlayStarted,
      showPoetry,
    } = this.props
    const parentProps = {
      className: "paneWrapper"
    }
    const childProps = {
      className: classNames('pane', { installation: mode === 'installation' }),
    }
    if (!isInstallation) {
      parentProps.onMouseOver = this.manager.handleInactivity
      parentProps.onTouchStart = onPlayStarted
      childProps.onContextMenu = this.manager.suppressContextMenu
    }
    return !loading && this.manager.composition.length && squareCount ? (
      <div {...parentProps}
      >
        <div {...childProps}>
          {this.manager.composition.map((audioItem) => {
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
            return <Trigger {...triggerProps} />
          })}
        </div>
      </div>
    ) : (
      initialized && (
        <div className="loading" onTouchStart={onPlayStarted}>
          <ReactLoading type="spinningBubbles" color="blue" delay={300} />
        </div>
      )
    )
  }
}

export default MusicPane
