import React, {Component} from 'react'
import {CSSTransition} from 'react-transition-group'
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
            <h1>Welcome to Impromptu Music Making</h1>
            <p>You are now a musical improviser with a wealth of sonic
            colors and textures at your fingertips.</p>
            <p className="green">Move your mouse to assemble your virtual instruments,
              then follow your musical imagination.</p>
            <p className="blue">Click the colored squares to play, or hold down the mouse button and drag.
            Click and hold to loop the instrument.
            Glowing squares are taking a break for musical reasons.</p>
            <p className="red">Ligter colors generally have a more melodic role
              than darker colors.</p>
            <p>Select a new piece from the menu on the left. There's one representing each time of day.</p>
            <div className="prompt">Click to begin.</div>
          </div>
          <div className="mobileMessage">
            <h1>Welcome to Impromptu Music Making</h1>
            <p>You are now a musical improviser with a wealth of sonic
              colors and textures at your fingertips.</p>
            <p className="green">Turn on your phone's ringer. Tap to add and play your virtual instruments,
              and follow your musical imagination.</p>
            <p className="blue">Hold down a colored square to loop the instrument.
              Glowing squares are taking a break for musical reasons.</p>
            <p className="red">Ligter colors generally have a more melodic role
              than darker colors.</p>
            <p>Select a new piece from the menu on the left. There's one representing each time of day.</p>
            <div className="prompt">Tap to begin.</div>
          </div>

        </div>
      </CSSTransition>
    )
  }
}