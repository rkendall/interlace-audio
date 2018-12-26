import React, {Component} from 'react'
import {Transition, CSSTransition} from 'react-transition-group'
import classNames from 'classnames'
import shallowEqual from 'shallowequal';
import './Trigger.css'

export default class Trigger extends Component {
  constructor() {
    super()
    this.state = {
      active: false,
      isDisplayed: false,
      isTextAnimating: false,
      isSquareActive: false,
      isSquareHovered: false,
      isSecondaryActive: false,
      isSecondaryDone: false,
      isGlowActive: false,
      isDisabled: false,
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const {play, disabled, fadeSquares} = this.props
    return play !== nextProps.play ||
      disabled !== nextProps.disabled ||
      fadeSquares !== nextProps.fadeSquares || !shallowEqual(this.state, nextState)
  }

  componentDidUpdate(prevProps, prevState) {
    const {fadeSquares, disabled} = this.props
    const { isSquareActive, isDisabled, isDisplayed, isSecondaryActive, isGlowActive } = this.state
    const newState = {}
    if (isSquareActive && !isDisplayed) {
      newState.isDisplayed = true
    }
    if (isDisplayed && disabled !== isDisabled && (!disabled || (!isSecondaryActive && !isGlowActive))) {
      newState.isDisabled = disabled
    }
    if (Object.keys(newState).length) {
      this.setState(newState)
    }
    if (fadeSquares && isSquareActive) {
      clearTimeout(this.timer)
      const timeout = 1000
      this.timer = setTimeout(() => {
        this.setState({
          isSquareActive: false,
          isSecondaryActive: false,
        })
      }, timeout)
    }
  }

  render() {
    const {play, audioIndex, audioName, group} = this.props
    const {isDisplayed, isDisabled, isSquareActive, isSecondaryActive, isSquareHovered, isGlowActive, isTextAnimating} = this.state
    const active = play || isTextAnimating
    const displayName = audioName.replace(/ \d+\w?$/, '')

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
                timeout={{enter: 800, exit: 0}}
                onEntered={this.stopGlow}
              >
                <div className={classNames('square', group) }>
                  <CSSTransition
                    in={isDisabled}
                    classNames="disabledContainer"
                    timeout={{enter: 500, exit: 1000}}
                  >
                    <div className="disabledContainer">
                      <Transition
                        in={isDisabled}
                        timeout={{enter: 500, exit: 1000}}
                      >
                        {status => {
                          let className = ''
                          if (status === 'exited') {
                            className = 'disabled-exit-done'
                          } else if (isDisabled || /exit/.test(status)) {
                            className = 'disabled-enter-active'
                          }
                          return <div className={classNames('disabled', className)} />
                        }}
                      </Transition>
                    </div>
                  </CSSTransition>
                </div>
              </CSSTransition>
            </CSSTransition>
          </div>
        </CSSTransition>
        <CSSTransition
          in={isSecondaryActive}
          timeout={{enter: 1000, exit: 0}}
          onEntered={this.stopSecondary}
          classNames="secondary"
        >
          <div className={classNames('secondary', group) }/>
        </CSSTransition>
        <div className="sensor"
             onMouseEnter={this.handleInteraction}
             onMouseDown={this.handleInteraction}
             onMouseLeave={this.handleInteraction}
        />
      </div>
    )
  }

  timer = null

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

  handleInteraction = event => {
    const {onTrigger, audioIndex} = this.props
    const {isDisplayed, isSquareHovered} = this.state
    const {type, buttons} = event
    const isClicked = type === 'mousedown' || (type === 'mouseenter' && buttons !== 0)
    const isHovered = type === 'mouseenter'
    const isUnhovered = type === 'mouseleave'
    const newState = {}
    if (isClicked) {
      onTrigger(audioIndex)
      newState.isSecondaryActive = true
      if (isDisplayed && !isHovered) {
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

}