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
      isSquareSelected: false,
      isGlowAnimating: false,
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
    if (audioIndex === 2) {
      console.log('render', audioIndex, audioName)
    }
    const {isSquareSelected, isDisplayed, isSquareActive, isSecondaryActive, isSquareHovered, isGlowAnimating, isTextAnimating} = this.state
    const active = play || isTextAnimating
    const isGlowActive = isGlowAnimating
    const showDisabled = disabled && isDisplayed
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
          classNames="square"
        >
          <CSSTransition
            in={isSquareHovered}
            timeout={300}
            classNames="squareHovered"
          >
            <CSSTransition
              in={isGlowActive}
              classNames="glow"
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
             onMouseEnter={this.onHover}
             onMouseDown={this.onClick}
             onMouseUp={this.onMouseUp}
             onMouseLeave={this.onUnhover}/>
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
      this.setState({isGlowAnimating: false})
    }
  }

  stopSecondary = ({animationName}) => {
    if (animationName === 'spin') {
      this.setState({
        isSecondaryActive: false,
      })
    }
  }

  onClick = () => {
    const {onTrigger, audioIndex} = this.props
    onTrigger(audioIndex)
    this.setState({
      isSquareSelected: true,
      isGlowAnimating: true,
      isSecondaryActive: true,
    })
  }

  onHover = (event) => {
    const {buttons} = event
    this.startHover()
    if (buttons !== 0) {
      this.onClick()
    }
  }

  onUnhover = () => {
    this.stopHover()
    this.setState({
      isSquareSelected: false,
    })
  }

}