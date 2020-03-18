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
      isSquareActive: false,
      isSquareHovered: false,
      isSecondaryActive: false,
      isSecondaryDone: false,
      isGlowActive: false,
      isDisabled: false,
      isDisabledAnimating: false,
      isLoopingAnimationActive: false,
    }
    this.disabledElement = createRef()
  }

  shouldComponentUpdate(nextProps, nextState) {
    const {play, disabled, fadeSquares, isLooping} = this.props
    return play !== nextProps.play ||
      disabled !== nextProps.disabled ||
      fadeSquares !== nextProps.fadeSquares ||
      isLooping !== nextProps.isLooping ||
      !shallowEqual(this.state, nextState)

  }

  componentDidUpdate(prevProps, prevState) {
    const {fadeSquares, disabled } = this.props
    const {isSquareActive, isDisabled, isDisplayed} = this.state
    const newState = {}
    if (isSquareActive && !isDisplayed) {
      newState.isDisplayed = true
    }
    if (isDisplayed && disabled !== isDisabled) {
      newState.isDisabled = disabled
    }
    if (Object.keys(newState).length) {
      this.setState(newState)
    }
    if (fadeSquares && isSquareActive) {
      clearTimeout(this.fadeTimer)
      const timeout = 1000
      this.fadeTimer = setTimeout(() => {
        this.setState({
          isSquareActive: false,
          isSecondaryActive: false,
        })
      }, timeout)
    }
  }

  componentWillUnmount() {
    clearTimeout(this.fadeTimer)
    clearTimeout(this.loopCheckTimer)
    this.disabledElement.current.removeEventListener('animationiteration', this.disabledAnimationDone, false)
  }

  render() {
    const { play, audioIndex, audioName, group, isLooping } = this.props
    const { isDisabled, isDisabledAnimating, isSquareActive, isSecondaryActive, isSquareHovered, isGlowActive, isTextAnimating, isLoopingAnimationActive } = this.state
    const active = (play || isTextAnimating) && !isLoopingAnimationActive
    const displayName = audioName.replace(/ \d+\w?$/, '')
    const activateGlow = isGlowActive && !isLoopingAnimationActive
    const activateSecondary = isSecondaryActive && !isLoopingAnimationActive

    return (
      <div className="trigger">
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
          in={isSquareHovered}
          timeout={300}
          classNames="squareHovered"
          onEntered={this.stopHover}
        >
          <div className="squareContainer">
            <CSSTransition
              in={isSquareActive}
              timeout={300}
              classNames="squareDisplay"
            >
                <CSSTransition
                in={isGlowActive}
                classNames="glow"
                timeout={{enter: 1500, exit: 0}}
                onEntered={this.stopGlow}
              >
                <div className={classNames('square', group) }>
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
            in={isLooping}
            timeout={1000}
            classNames="looping"
            onExited={this.stopLooping}
          >
            <div className="secondaryWrapper">
              <div className={classNames('secondary', group) }/>
            </div>
          </CSSTransition>
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
    })
  }

  onTextAnimationDone = () => {
    this.setState({
      isTextAnimating: false,
    })
  }

  startHover = () => {
    this.setState({isSquareHovered: true})
  }

  stopHover = () => {
    this.setState({isSquareHovered: false})
  }

  stopGlow = () => {
    this.setState({isGlowActive: false})
  }

  stopSecondary = ({animationName}) => {
    this.setState({
      isSecondaryActive: false,
    })
  }

  stopLoopingAnimation = () => {
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
    const {onTrigger, audioIndex, onSelect} = this.props
    const {isDisplayed} = this.state
    const {type, buttons} = event
    const isClicked = type === 'mousedown' || (type === 'mouseenter' && buttons !== 0)
    const isHovered = type === 'mouseenter'
    const isUnclicked = type === 'mouseup' || type === 'mouseleave'
    const newState = {}
    if (isClicked) {
      onSelect()
      onTrigger(audioIndex)
      this.startLoopCheckTimer(audioIndex)
      newState.isSecondaryActive = true
      if (isDisplayed) {
        newState.isGlowActive = true
      }
    }
    if (isHovered) {
      newState.isSquareActive = true
      newState.isSquareHovered = true
    }
    this.setState({
      ...newState,
    })
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

  onHover = event => {
    this.handleInteraction(event)
  }

  onUnhover = event => {
    this.handleInteraction(event)
  }

  onLoopToggle = audioIndex => {
    this.props.onLoopToggle(audioIndex)
  }

}