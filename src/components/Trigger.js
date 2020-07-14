import React, {PureComponent, createRef} from 'react'
import {Transition, CSSTransition} from 'react-transition-group'
import TinyGesture from 'tinygesture'
import classNames from 'classnames'
import './Trigger.css'
import poetry from '../poetry'

export default class Trigger extends PureComponent {
  constructor(props) {
    super(props)
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
      poemWord: '',
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
    const {audioName, audioIndex, group, isLooping, isPlaying, isPoetry} = this.props
    const {showDisabled, isDisabledAnimating, isSecondaryActive, isSquareHovered, isSquareTriggered, isGlowActive, isTextAnimating, isLoopingAnimationActive, stopLooping, isDisplayed, suppressTextHint, isCursorDisabled, poemWord} = this.state
    const doLooping = isLooping && !stopLooping
    const active = (isPlaying || isTextAnimating) && !isLoopingAnimationActive
    const activateSecondary = isSecondaryActive && !isLoopingAnimationActive
    const groupClassName = group.replace(/\d+$/, '')
    const disabledActive = showDisabled || isDisabledAnimating
    const text = isPoetry ? poemWord : audioName.replace(/ \d+\w?$/, '')
    const textHint = isPoetry ? '' : text
    return (
      <div className={classNames('trigger', {visible: isDisplayed}, {isDisabled: isCursorDisabled})}>
        <CSSTransition
          in={active}
          timeout={isPoetry ? 10000 : 3000}
          classNames={isPoetry ? 'poetry' : 'text'}
          unmountOnExit
          onEnter={this.onTextAnimationStarted}
          onEntered={this.onTextAnimationDone}
        >
          <div className={isPoetry ? 'poetry' : 'text'} key={audioIndex}><div>{text}</div></div>
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
              {!suppressTextHint ? <div key={audioIndex} className="textHint">{textHint}</div> : <div />}
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
             onTouchEnd={this.handleInteraction}
        />
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
        newState.poemWord = poetry.get({group, fast: !allowDisabled})
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
    const {onTrigger, audioIndex, fadeAllSquares, isPlaying, disabled, isLooping} = this.props
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
    this.setState(({showDisabled}) => {
      const newState = {}
      if (isClicked || isDragged) {
        onTrigger({audioIndex, isDragged})
        if (!isPlaying && !showDisabled) {
          newState.suppressTextHint = true
        } else {
          newState.isGlowActive = true
        }
        newState.isSecondaryActive = true
        newState.isClicked = true
      }
      const shouldDisableCursor = disabled || (isPlaying && ! isLooping)
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
      return newState
    })
    if (isClicked) {
      this.onLoopToggle(audioIndex)
    }
    if (isUnclicked) {
      this.disableCursorTimer = setTimeout(() => {
        this.setState({allowCursorDisabled: true})
      }, 200)
      this.onUnclick()
    }
  }

  onClick = event => {
    this.handleInteraction(event)
  }

  onUnclick = audioIndex => {
    this.props.onUnclick(audioIndex)
  }

  onLoopToggle = audioIndex => {
    this.props.onLoopToggle(audioIndex)
  }

}