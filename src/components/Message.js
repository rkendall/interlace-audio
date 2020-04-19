import React, {Component} from 'react'
import classNames from 'classnames'
import {Transition, CSSTransition} from 'react-transition-group'
import {AwesomeButton as Button} from 'react-awesome-button'
import 'react-awesome-button/dist/styles.css'
import './Message.css'
import './Button.css'

export default class Message extends Component {

  render() {
    const {onClick, open} = this.props
    return (
      <CSSTransition
        in={open}
        appear
        timeout={{enter: 500, exit: 500}}
        classNames="messageContainer"
      >
        <div className="messageContainer" onClick={onClick}>
          <div className="message">
            <p>Move your mouse over this area to add colored squares,</p>
            <p>then click on them to play, or hold down the mouse button and drag.</p>
            <p>Glowing squares are temporarily disabled for musical reasons.</p>
            <p>From the menu on the left you can select music representing different times of day.</p>
            <div className="prompt">Click to begin.</div>
          </div>
          <div className="mobileMessage">
            <p>Tap this area to add and play instruments.</p>
            <p>Glowing squares are temporarily disabled for musical reasons.</p>
            <p>From the menu on the left you can select music representing different times of day.</p>
            <div className="prompt">Tap to begin.</div>
          </div>

        </div>
      </CSSTransition>
    )
  }
}