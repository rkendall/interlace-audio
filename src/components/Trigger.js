import React, {PureComponent, createRef} from 'react'
import {Transition, CSSTransition} from 'react-transition-group'
import TinyGesture from 'tinygesture'
import classNames from 'classnames'
import './Trigger.css'

export default class Trigger extends PureComponent {
  constructor() {
    super()
    this.state = {
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
    }
    this.disabledElement = createRef()
    this.sensor = createRef()
  }

  componentDidMount() {
    if (window.isTouchDevice) {
      this.gesture = new TinyGesture(this.sensor.current)
      this.gesture.on('longpress', event => {
        this.handleInteraction({type: 'longpress'})
      })
      this.gesture.on('doubletap', event => {
        this.handleInteraction({type: 'doubletap'})
      })
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const {fadeSquares, disabled, allowDisabled, isPlaying, fadeAllSquares, isLooping} = this.props
    const {isDisplayed, allowCursorDisabled} = this.state
    if (!isDisplayed) {
      return
    }
    this.setState(({showDisabled, isDisplayed}) => {
      if (!isDisplayed) {
        return null
      }
      const newShowDisabledState = disabled && allowDisabled
      return {
        showDisabled: newShowDisabledState,
        isCursorDisabled: allowCursorDisabled && (disabled || isPlaying) && !isLooping,
      }
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
    this.disabledElement.current.removeEventListener('animationiteration', this.disabledAnimationDone, false)
    if (this.gesture) {
      this.gesture.destroy()
    }
  }

  render() {
    const {audioIndex, audioName, group, isLooping, isPlaying, disabled} = this.props
    const {showDisabled, isDisabledAnimating, isSecondaryActive, isSquareHovered, isSquareTriggered, isGlowActive, isTextAnimating, isLoopingAnimationActive, stopLooping, isDisplayed, suppressTextHint, isCursorDisabled} = this.state
    const doLooping = isLooping && !stopLooping
    const active = (isPlaying || isTextAnimating) && !isLoopingAnimationActive
    const displayName = audioName.replace(/ \d+\w?$/, '')
    const activateSecondary = isSecondaryActive && !isLoopingAnimationActive
    const groupClassName = group.replace(/\d+$/, '')
    const disabledActive = showDisabled || isDisabledAnimating
    return (
      <div className={classNames('trigger', {visible: isDisplayed}, {isDisabled: isCursorDisabled})}>
        <CSSTransition
          in={active}
          timeout={3000}
          classNames="text"
          unmountOnExit
          onEnter={this.onTextAnimationStarted}
          onEntered={this.onTextAnimationDone}
        >
          <div className="text" key={audioIndex}>{displayName}</div>
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
                timeout={{enter: 1500, exit: 0}}
                onEntered={this.stopGlow}
              >
                <div className={classNames('square', groupClassName) }>
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
          timeout={{enter: 1000, exit: 0}}
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
              <div className={classNames('secondary', groupClassName) }/>
            </div>
          </CSSTransition>
        </CSSTransition>
        <CSSTransition
          in={!isSquareHovered}
          timeout={{enter: 1000, exit: 500}}
          classNames="textHintContainer"
        >
          <div className="textHintContainer">
            <CSSTransition
              in={isSquareHovered && !suppressTextHint}
              timeout={{enter: 1000, exit: 500}}
              classNames="textHint"
            >
              {!suppressTextHint ? <div key={audioIndex} className="textHint">{displayName}</div> : <div />}
            </CSSTransition>
          </div>
        </CSSTransition>
        <div className="sensor"
             ref={this.sensor}
             onMouseEnter={this.handleInteraction}
             onMouseLeave={this.handleInteraction}
             onMouseDown={this.handleInteraction}
             onMouseUp={this.handleInteraction}
             onDoubleClick={this.handleInteraction}
             onTouchStart={this.handleInteraction}
             onTouchEnd={this.handleInteraction}
        />
      </div>
    )
  }

  fadeTimer = null

  longPressTimer = null

  gesture = null

  onTextAnimationStarted = ()=> {
    this.setState({
      isTextAnimating: true,
      showTextHint: false,
    })
  }

  onTextAnimationDone = () => {
    this.setState({
      isTextAnimating: false,
    })
  }

  resetTrigger = () => {
    this.setState({isSquareTriggered: false})
  }

  stopGlow = () => {
    this.setState({isGlowActive: false})
  }

  stopSecondary = ({animationName}) => {
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
    const {isDisabledAnimating} = this.state
    if (!isDisabledAnimating) {
      this.setState({
        isDisabledAnimating: true,
      })
    }
  }

  disabledAnimationDone = () => {
    this.setState(({showDisabled, isDisabledAnimating}) => {
      if (!showDisabled && isDisabledAnimating) {
        return {
          isDisabledAnimating: false,
        }
      }
    })
  }

  handleInteraction = event => {
    const {onTrigger, audioIndex, onSelect, fadeAllSquares, isPlaying, disabled} = this.props
    if (fadeAllSquares) {
      return
    }
    const {type: receivedType, buttons} = event
    // If on a touch device, filter out mouse events
    const type = this.gesture && /mouse|click/.test(receivedType) ? null : receivedType

    const isClicked = type === 'mousedown' || type === 'touchstart'
    const isDragged = (type === 'mouseenter' && buttons !== 0)
    const isHovered = type === 'mouseenter' || type === 'touchstart'
    const isUnHovered = type === 'mouseleave' || type === 'touchend'
    const isUnclicked = type === 'mouseup' || type === 'mouseleave' || type === 'touchend'
    const isDoubleClicked = type === 'dblclick' || type === 'doubletap'
    const isLongPressed = type === 'longclick' || type === 'longpress'
    this.setState(({showDisabled}) => {
      const newState = {}
      if (isClicked || isDragged) {
        onTrigger({audioIndex, isDragged})
        if (!window.isTouchDevice) {
          this.startLongPressTimer()
        }
        if (!isPlaying && !showDisabled) {
          newState.suppressTextHint = true
        } else {
          newState.isGlowActive = true
        }
        newState.isSecondaryActive = true
        newState.isClicked = true
      }
      const shouldDisableCursor = disabled || isPlaying
      if (isDragged || (!shouldDisableCursor && isClicked)) {
        newState.allowCursorDisabled = false
      }
      if (isHovered) {
        newState.isSquareTriggered = true
        newState.isDisplayed = true
        newState.isSquareHovered = true
      }
      if (isUnHovered) {
        newState.suppressTextHint = false
        newState.isSquareHovered = false
      }
      if (isLongPressed || isDoubleClicked) {
        this.onLoopToggle(audioIndex)
      }
      return newState
    })
    if (isUnclicked) {
      this.disableCursorTimer = setTimeout(() => {
        this.setState({allowCursorDisabled: true})
      }, 200)
      this.endLongPressTimer()
    }
  }

  startLongPressTimer = () => {
    const mouseDownDelay = 1000
    clearTimeout(this.longPressTimer)
    this.longPressTimer = setTimeout(() => {
      this.handleInteraction({type: 'longclick'})
    }, mouseDownDelay)
  }

  endLongPressTimer = () => {
    clearTimeout(this.longPressTimer)
  }

  onClick = event => {
    this.handleInteraction(event)
  }

  onLoopToggle = audioIndex => {
    this.props.onLoopToggle(audioIndex)
  }

}