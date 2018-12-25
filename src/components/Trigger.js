import React, {Component} from 'react'
import {CSSTransition} from 'react-transition-group'
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
    const {isSquareActive, isDisplayed} = this.state
    const newState = {}
    if (isSquareActive && !isDisplayed) {
      newState.isDisplayed = true
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
    const {play, disabled, audioIndex, audioName, group} = this.props
    const {isDisplayed, isSquareActive, isSecondaryActive, isSquareHovered, isGlowActive, isTextAnimating} = this.state
    const active = play || isTextAnimating
    const showDisabled = disabled && isDisplayed && !isSecondaryActive && !isGlowActive
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
          in={isSquareActive}
          timeout={300}
          classNames={{
            enterActive: 'square-enter-active',
            enterDone: 'rotateBack square-enter-done',
            exitDone: 'square-exit-done',
          }}
        >
          <CSSTransition
            in={isSquareHovered}
            timeout={300}
            classNames="squareHovered"
          >
            <CSSTransition
              in={isGlowActive}
              classNames={{
                enterActive: 'glow-enter-active',
                enterDone: 'glow-enter-done',
                exitActive: 'rotateBack',
              }}
              timeout={{enter: 800, exit: 3000}}
              addEndListener={node => {
                node.addEventListener('animationend', this.stopGlow, false);
              }}
            >
              <div className={classNames('square', group) }>
                <CSSTransition
                  in={showDisabled}
                  classNames="disabledContainer"
                  timeout={{enter: 500, exit: 1000}}
                >
                  <div className="disabledContainer">
                    <CSSTransition
                      in={showDisabled}
                      classNames="disabled"
                      addEndListener={() => {}}
                    >
                      <div className="disabled"/>
                    </CSSTransition>
                  </div>
                </CSSTransition>
              </div>
            </CSSTransition>
          </CSSTransition>
        </CSSTransition>
        <CSSTransition
          in={isSecondaryActive}
          addEndListener={node => {
            node.addEventListener('animationend', this.stopSecondary, false);
          }}
          classNames="secondary"
        >
          <div className={classNames('secondary', group) }/>
        </CSSTransition>
        <div className="sensor"
             onMouseEnter={this.handleInteraction}
             onMouseDown={this.handleInteraction}
             onMouseLeave={this.handleInteraction}/>
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
    this.setState({isSquareActive: true, isSquareHovered: true})
  }

  stopHover = () => {
    this.setState({isSquareHovered: false})
  }

  stopGlow = ({animationName}) => {
    if (animationName === 'glow') {
      this.setState({isGlowActive: false})
    }
  }

  stopSecondary = ({animationName}) => {
    if (animationName === 'spin') {
      this.setState({
        isSecondaryActive: false,
      })
    }
  }

  handleInteraction = event => {
    const {onTrigger, audioIndex} = this.props
    const { isDisplayed } = this.state
    const { type, buttons } = event
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
    } else if (isUnhovered) {
      newState.isSquareHovered = false
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