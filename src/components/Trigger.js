import React, {Component, createRef} from 'react'
import {Transition, CSSTransition} from 'react-transition-group'
import classNames from 'classnames'
import shallowEqual from 'shallowequal'
import './Trigger.css'

export default class Trigger extends Component {
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
      isDisabled: false,
      isDisabledAnimating: false,
      isLoopingAnimationActive: false,
      stopLooping: false,
      suppressTextHint: false,
    }
    this.disabledElement = createRef()
  }

  shouldComponentUpdate(nextProps, nextState) {
    const {isPlaying, disabled, fadeSquares, fadeAllSquares, isLooping} = this.props
    return isPlaying !== nextProps.isPlaying ||
      disabled !== nextProps.disabled ||
      fadeSquares !== nextProps.fadeSquares ||
      fadeAllSquares !== nextProps.fadeAllSquares ||
      isLooping !== nextProps.isLooping ||
      !shallowEqual(this.state, nextState)
  }

  componentDidUpdate(prevProps, prevState) {
    const {fadeSquares, disabled, fadeAllSquares} = this.props
    const {isDisabled, isDisplayed} = this.state
    const newState = {}
    if (isDisplayed && disabled !== isDisabled) {
      newState.isDisabled = disabled
    }
    if (Object.keys(newState).length) {
      this.setState(newState)
    }
    if ((fadeSquares || fadeAllSquares) && isDisplayed) {
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
    clearTimeout(this.loopCheckTimer)
    clearTimeout(this.fadeAllTimer)
    this.disabledElement.current.removeEventListener('animationiteration', this.disabledAnimationDone, false)
  }

  render() {
    const {audioIndex, audioName, group, isLooping, isPlaying} = this.props
    const {isDisabled, isDisabledAnimating, isSecondaryActive, isSquareHovered, isSquareTriggered, isGlowActive, isTextAnimating, isLoopingAnimationActive, stopLooping, isDisplayed, suppressTextHint} = this.state
    const doLooping = isLooping && !stopLooping
    const active = (isPlaying || isTextAnimating) && !isLoopingAnimationActive
    const displayName = audioName.replace(/ \d+\w?$/, '')
    const activateSecondary = isSecondaryActive && !isLoopingAnimationActive
    const groupClassName = group.replace(/\d+$/, '')

    return (
      <div className={classNames('trigger', {visible: isDisplayed})}>
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
                      in={isDisabled || isDisabledAnimating}
                      exit={false}
                      onEnter={this.disabledAnimationStarted}
                      addEndListener={node => {
                        node.addEventListener('animationiteration', this.disabledAnimationDone, false)
                      }}
                    >
                      {() => {
                        let className = ''
                        if (isDisabled || isDisabledAnimating) {
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
          <div className="textHintContainer" >
            <CSSTransition
              in={isSquareHovered && !suppressTextHint}
              timeout={{enter: 1000, exit: 500}}
              classNames="textHint"
            >
              {!suppressTextHint ? <div key={audioIndex} className="textHint" >{displayName}</div> : <div />}
            </CSSTransition>
          </div>
        </CSSTransition>
        <div className="sensor"
             onMouseEnter={this.handleInteraction}
             onMouseLeave={this.handleInteraction}
             onMouseDown={this.handleInteraction}
             onMouseUp={this.handleInteraction}
        />
      </div>
    )
  }

  fadeTimer = null

  loopCheckTimer = null

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
    const {isDisabled, isDisabledAnimating} = this.state
    if (!isDisabled && isDisabledAnimating) {
      this.setState({
        isDisabledAnimating: false,
      })
    }
  }

  handleInteraction = event => {
    const {onTrigger, audioIndex, onSelect, fadeAllSquares, isPlaying} = this.props
    const {isDisabled} = this.state
    if (fadeAllSquares) {
      return
    }
    const {type, buttons} = event
    const isClicked = type === 'mousedown'
    const isDragged = (type === 'mouseenter' && buttons !== 0)
    const isHovered = type === 'mouseenter'
    const isUnHovered = type === 'mouseleave'
    const isUnclicked = type === 'mouseup' || type === 'mouseleave'
    const newState = {}
    if (isClicked || isDragged) {
      onSelect()
      onTrigger(audioIndex)
      this.startLoopCheckTimer(audioIndex)
      if (!isPlaying && !isDisabled) {
        newState.suppressTextHint = true
      } else {
        newState.isGlowActive = true
      }
      newState.isSecondaryActive = true
      newState.isClicked = true
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
    this.setState(newState)
    if (isUnclicked) {
      this.endLoopCheckTimer()
    }
  }

  startLoopCheckTimer = audioIndex => {
    const mouseDownDelay = 1000
    clearTimeout(this.loopCheckTimer)
    this.loopCheckTimer = setTimeout(() => {
      this.onLoopToggle(audioIndex)
    }, mouseDownDelay)
  }

  endLoopCheckTimer = () => {
    clearTimeout(this.loopCheckTimer)
  }

  onClick = event => {
    this.handleInteraction(event)
  }

  onLoopToggle = audioIndex => {
    this.props.onLoopToggle(audioIndex)
  }

}