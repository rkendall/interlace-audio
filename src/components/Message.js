import React, {Component} from 'react'
import classNames from 'classnames'
import './Message.css'

export default class Message extends Component {

  constructor() {
    super()
    this.state = {
      mouseMoved: false,
      musicPaneEntered: false,
    }
  }

  render() {
    const {mouseMoved, musicPaneEntered} = this.state
    const fadeMessage = mouseMoved && musicPaneEntered
    return (
      <div className={classNames('messageContainer', {fade: fadeMessage})} onMouseMove={this.onMouseMove}
           onMouseOver={this.onMouseOver}>
        <div className="message">
          <div>Move your mouse here to add instruments,</div>
          <div>then hold down the mouse button to play.</div>
        </div>
      </div>
    )
  }

  onMouseMove = () => {
    this.setState({mouseMoved: true})
  }

  onMouseOver = () => {
    this.setState({musicPaneEntered: true})
  }

}