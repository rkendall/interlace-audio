import React, {Component} from 'react'
import classNames from 'classnames'
import './Message.css'

export default class Message extends Component {

  constructor() {
    super()
    this.state = {
      fadeMessage: false,
    }
  }

  render() {
    return (
      <div className={classNames('messageContainer', {fade: this.state.fadeMessage})}>
        <div className="message" onMouseMove={this.hideMessage}>
          <div>Move your mouse here to add instruments,</div>
          <div>then hold down the mouse button to play.</div>
        </div>
      </div>
    )
  }

  hideMessage = ()=> {
    this.setState({
      fadeMessage: true,
    })
  }

}