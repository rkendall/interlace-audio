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
      isSquareSelected: false,
      isGlowAnimating: false,
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const {play, enabled, fadeSquares} = this.props
    return play !== nextProps.play ||
      enabled !== nextProps.enabled ||
      fadeSquares !== nextProps.fadeSquares || !shallowEqual(this.state, nextState)
  }

  componentDidUpdate(prevProps, prevState) {
    const {fadeSquares} = this.props
    const {isSquareActive, isDisplayed} = this.state
    if (isSquareActive && !isDisplayed) {
      this.setState({
        isDisplayed: true,
      })
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
    const {play, enabled, audioIndex, audioName, group} = this.props
    const {isSquareSelected, isDisplayed, isSquareActive, isSecondaryActive, isSquareHovered, isGlowAnimating, isTextAnimating} = this.state
    const active = play || isTextAnimating
    const isGlowActive = (isSquareSelected || isGlowAnimating)
    const showEnabled = !enabled && isDisplayed
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
              timeout={300}
              classNames="glow"
              onEnter={this.startSecondaryAnimation}
              onEntering={this.startGlow}
              onEntered={this.stopGlow}
            >
              <div className={classNames('square', group) }>
                <CSSTransition
                  in={showEnabled}
                  timeout={1000}
                  classNames="enabled"
                >
                  <div className="enabled" />
                </CSSTransition>
              </div>
            </CSSTransition>
          </CSSTransition>
        </CSSTransition>
        <CSSTransition
          in={isSecondaryActive}
          timeout={1000}
          classNames="secondary"
        >
          <div className={classNames('secondary', group) }/>
        </CSSTransition>
        <div className="sensor"
             onMouseEnter={this.onHover} onMouseDown={this.onHover}
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

  startSecondaryAnimation = () => {
    this.setState({
      isSecondaryActive: true,
    })
    setTimeout(() => {
      this.setState({
        isSecondaryActive: false,
      })
    }, 2000)
  }

  stopSecondaryAnimation = () => {
    this.setState({
      isSecondaryActive: false,
    })
  }

  startHover = () => {
    this.setState({isSquareActive: true, isSquareHovered: true})
  }

  stopHover = () => {
    this.setState({isSquareHovered: false})
  }

  startGlow = () => {
    this.setState({isGlowAnimating: true})
  }

  stopGlow = () => {
    this.setState({isGlowAnimating: false})
  }

  onHover = (event) => {
    const {onTrigger, audioIndex} = this.props
    const {buttons} = event
    this.startHover()
    if (buttons !== 0) {
      onTrigger(audioIndex)
      this.setState({
        isSquareSelected: true,
      })
    }
  }

  onUnhover = () => {
    this.stopHover()
    this.setState({
      isSquareSelected: false,
    })
  }

}