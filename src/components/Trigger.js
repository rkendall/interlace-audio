import React, { PureComponent, createRef } from 'react'
import { Transition, CSSTransition } from 'react-transition-group'
import classNames from 'classnames'
import './Trigger.scss'
import poetry from '../poetry'
import { isSmallScreen } from '../utilities';
import mode from '../mode'

const isInstallation = mode === 'installation'

export default class Trigger extends PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      isTopRow: false,
      isDisplayed: false,
      isTextAnimating: false,
      isSquareHovered: false,
      isSquareTrigger: false,
      isSecondaryActive: false,
      isSecondaryDone: false,
      isGlowActive: false,
      showDisabled: false,
      isDisabledAnimating: false,
      isLoopingAnimationActive: false,
      stopLooping: false,
      suppressTextHint: false,
      allowCursorDisabled: false,
      isCursorDisabled: false,
      poemWord: '',
    }
    this.disabledElement = createRef()
    this.sensor = createRef()
  }

  componentDidMount() {
    const sensor = this.sensor.current
    if (sensor && sensor.getBoundingClientRect().top === 0) {
      this.setState({ isTopRow: true })
    }
    if (!window.isTouchDevice) {
      return
    }
    // Enables dragging with finger
    sensor.addEventListener("pointerdown", (event) => {
      this.sensor.current.releasePointerCapture(event.pointerId)
      this.handleInteraction(event)
    })
    sensor.addEventListener("pointerup", (event) => {
      this.handleInteraction(event)
    })
    sensor.addEventListener("pointerenter", (event) => {
      this.handleInteraction(event)
    })
    sensor.addEventListener("pointerleave", (event) => {
      this.handleInteraction(event)
    })
  }

  componentDidUpdate(prevProps, prevState) {
    const { fadeSquares, disabled, allowDisabled, isPlaying, fadeAllSquares, showAllSquares, isLooping, activeIndex, setActiveIndex, audioIndex } = this.props
    const isDisabledAllowed = isInstallation ? true : allowDisabled
    if (isInstallation && activeIndex === audioIndex) {
      this.handleInteraction({ type: 'mousedown' })
      setActiveIndex(null)
    }
    const { isDisplayed } = this.state
    if (!isDisplayed) {
      if (showAllSquares || isPlaying) {
        this.setState({ isDisplayed: true })
      } else {
        return
      }
    }
    this.setState(state => {
      const { allowCursorDisabled } = state
      const newState = {
        showDisabled: disabled && isDisabledAllowed,
        isCursorDisabled: allowCursorDisabled && (disabled || isPlaying) && !isLooping,
      }
      const update = Object.entries(newState).some(([name, value]) => state[name] !== value)
      return update ? newState : null
    })
    if (fadeSquares || fadeAllSquares) {
      clearTimeout(this.fadeTimer)
      const timeout = 1000
      const newState = {
        isSecondaryActive: false,
        isDisplayed: false,
      }
      if (fadeAllSquares) {
        newState.stopLooping = true
      }
      this.fadeTimer = setTimeout(() => {
        this.setState(newState)
      }, timeout)
    }
  }

  componentWillUnmount() {
    clearTimeout(this.fadeTimer)
    clearTimeout(this.longPressTimer)
    clearTimeout(this.disableCursorTimer)
    this.disabledElement?.current?.removeEventListener('animationiteration', this.disabledAnimationDone, false)
    if (this.gesture) {
      this.gesture.destroy()
    }
  }

  render() {
    const { audioName, audioIndex, group, isLooping, isPlaying, isPoetry } = this.props
    const { isTopRow, showDisabled, isDisabledAnimating, isSecondaryActive, isSquareHovered, isSquareTriggered, isGlowActive, isTextAnimating, isLoopingAnimationActive, stopLooping, isDisplayed, suppressTextHint, isCursorDisabled, poemWord, poemStyle } = this.state
    const doLooping = isLooping && !stopLooping
    const active = (isPlaying || isTextAnimating) && !isLoopingAnimationActive
    const activateSecondary = isInstallation ? false : isSecondaryActive && !isLoopingAnimationActive
    const groupClassName = group.replace(/\d+$/, '')
    const disabledActive = showDisabled || isDisabledAnimating
    const canShowTextHint = !suppressTextHint && !isPoetry && !window.isTouchDevice
    const text = isPoetry ? poemWord : audioName.replace(/ \d+\w?$/, '')
    // if (audioIndex === 0 && active) {
    //   console.debug('audioIndex', audioIndex)
    //   console.debug('active', active)
    //   console.debug('disabledActive', disabledActive)
    //   console.debug('isDisabledAnimating', isDisabledAnimating)
    //   console.debug('activateSecondary', activateSecondary)
    // }
    return isInstallation ? (
      <div className={classNames('installation', 'trigger', { playing: isPlaying }, { visible: isDisplayed }, { isDisabled: isCursorDisabled }, { largeText: isSmallScreen() })}>
        <div className={classNames('square', 'squareDisplay', 'squareContainer', groupClassName)} />
        <div className="text"><div>{audioIndex}</div><div>{audioName}</div></div>
      </div>
    ) : (
      <div className={classNames('trigger', 'application', { visible: isDisplayed }, { isDisabled: isCursorDisabled }, { largeText: isSmallScreen() })}>
        <CSSTransition
          in={active}
          timeout={isPoetry ? 10000 : 3000}
          classNames={isPoetry ? 'poetry' : 'text'}
          unmountOnExit
          onEnter={this.onTextAnimationStarted}
          onEntered={this.onTextAnimationDone}
        >
          <div className={isPoetry ? 'poetry' : 'text'} key={audioIndex}>
            <div className={classNames(poemStyle || '', isTopRow ? 'topRow' : 'lowerRow')}>{text}</div>
          </div>
        </CSSTransition>
        <CSSTransition
          in={isSquareTriggered}
          timeout={300}
          classNames="squareHovered"
          onEntered={this.resetTrigger}
        >
          <div className="squareContainer">
            <CSSTransition
              in={isDisplayed}
              timeout={300}
              classNames="squareDisplay"
            >
              <CSSTransition
                in={isGlowActive}
                classNames="glow"
                timeout={{ enter: 1500, exit: 0 }}
                onEntered={this.stopGlow}
              >
                <div className={classNames('square', groupClassName)}>
                  <div className="disabledContainer">
                    <Transition
                      in={disabledActive}
                      exit={false}
                      onEnter={this.disabledAnimationStarted}
                      addEndListener={node => {
                        node.addEventListener('animationiteration', this.disabledAnimationDone, false)
                      }}
                    >
                      {() => {
                        let className = ''
                        if (disabledActive) {
                          className = 'pulse'
                        } else {
                          className = 'pulseFade'
                        }
                        return <div
                          className={classNames('disabled', className)}
                          ref={this.disabledElement}
                        />
                      }}
                    </Transition>
                  </div>
                </div>
              </CSSTransition>
            </CSSTransition>
          </div>
        </CSSTransition>
        <CSSTransition
          in={activateSecondary}
          timeout={{ enter: 1000, exit: 0 }}
          classNames="secondaryWrapper"
          onEntered={this.stopSecondary}
        >
          <CSSTransition
            in={doLooping}
            timeout={1000}
            classNames="looping"
            onExited={this.loopingStopped}
          >
            <div className="secondaryWrapper">
              <div className={classNames('secondary', groupClassName)} />
            </div>
          </CSSTransition>
        </CSSTransition>
        <CSSTransition
          in={canShowTextHint && !isSquareHovered}
          timeout={{ enter: 1000, exit: 500 }}
          classNames="textHintContainer"
        >
          <div className="textHintContainer">
            <CSSTransition
              in={isSquareHovered && canShowTextHint}
              timeout={{ enter: 1000, exit: 500 }}
              classNames="textHint"
            >
              {canShowTextHint ? <div key={audioIndex} className="textHint">{text}</div> : <div />}
            </CSSTransition>
          </div>
        </CSSTransition>
        <div className="sensor"
          ref={this.sensor}
          onMouseEnter={this.handleInteraction}
          onMouseLeave={this.handleInteraction}
          onMouseDown={this.handleInteraction}
          onMouseUp={this.handleInteraction}
          onTouchStart={this.handleInteraction}
          onTouchEnd={this.handleInteraction} />
      </div>
    )
  }

  fadeTimer = null

  longPressTimer = null

  gesture = null

  onTextAnimationStarted = () => {
    const { group, isPoetry, allowDisabled } = this.props
    this.setState(() => {
      const newState = {
        isTextAnimating: true,
        showTextHint: false,
      }
      if (isPoetry) {
        const { phrase, style } = poetry.get({ group, fast: !allowDisabled })
        newState.poemWord = phrase
        newState.poemStyle = style
      }
      return newState
    })
  }

  onTextAnimationDone = () => {
    this.setState({
      isTextAnimating: false,
    })
  }

  resetTrigger = () => {
    this.setState({ isSquareTriggered: false })
  }

  stopGlow = () => {
    this.setState({ isGlowActive: false })
  }

  stopSecondary = ({ animationName }) => {
    this.setState({
      isSecondaryActive: false,
    })
  }

  loopingStopped = () => {
    this.setState({
      isLoopingAnimationActive: false,
    })
  }

  disabledAnimationStarted = () => {
    const { isDisabledAnimating } = this.state
    if (!isDisabledAnimating) {
      this.setState({
        isDisabledAnimating: true,
      })
    }
  }

  disabledAnimationDone = () => {
    this.setState(({ showDisabled, isDisabledAnimating }) => {
      if (!showDisabled && isDisabledAnimating) {
        return {
          isDisabledAnimating: false,
        }
      }
    })
  }

  handleInteraction = event => {
    const { onTrigger, audioIndex, fadeAllSquares, isPlaying, disabled, isLooping, onUnclick, onLoopToggle } = this.props
    if (fadeAllSquares) {
      return
    }
    const { type, buttons, pointerId } = event
    // If on a touch device, filter out mouse events
    // const type = window.isTouchDevice && /mouse/.test(receivedType) ? null : receivedType

    this.setState(({ showDisabled }) => {
      if (mode === 'installation') {
        onTrigger({ audioIndex, isMouseDragged: false, pointerId })
        return {
          isSecondaryActive: true,
          isClicked: true,
        }
      }
      const newState = {}
      const isMouseDragged = !window.isTouchDevice ? type === 'mouseenter' && buttons !== 0 : false
      const isTriggered = isMouseDragged || type === 'mousedown' || type === 'pointerenter'
      let isDragged
      if (isTriggered) {
        isDragged = onTrigger({ audioIndex, isMouseDragged, pointerId }).isDragged
      } else {
        isDragged = isMouseDragged
      }
      const isClicked = (type === 'mousedown' || type === 'pointerdown') && !isDragged
      const isTouched = type === 'pointerenter'
      const isUntouched = type === 'pointerleave'
      const isHovered = type === 'mouseenter'
      const isUnHovered = type === 'mouseleave'
      const isUnclicked = type === 'mouseup' || type === 'mouseleave' || type === 'pointerleave'
      const shouldDisableCursor = disabled || (isPlaying && !isLooping)
      // Allow new text to float before current text has finished floating
      if (isClicked && !disabled) {
        newState.isTextAnimating = false
      }
      if (isClicked || isDragged) {
        if (!isPlaying && !showDisabled) {
          newState.suppressTextHint = true
        } else {
          newState.isGlowActive = true
        }
        newState.isSecondaryActive = true
        newState.isClicked = true
      }
      if (isDragged || (!shouldDisableCursor && isClicked)) {
        newState.allowCursorDisabled = false
      }
      if (isClicked) {
        onLoopToggle(audioIndex)
      }
      if (isHovered || isTouched) {
        newState.isSquareTriggered = true
        newState.isDisplayed = true
        newState.isSquareHovered = true
      }
      if (isUnHovered || isUntouched) {
        newState.suppressTextHint = false
        newState.isSquareHovered = false
      }
      if (isUnclicked) {
        this.disableCursorTimer = setTimeout(() => {
          this.setState({ allowCursorDisabled: true })
        }, 200)
        onUnclick()
      }
      return newState
    })
  }

}