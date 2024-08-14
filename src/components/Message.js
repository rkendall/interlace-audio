import React, {Component} from 'react'
import {CSSTransition} from 'react-transition-group'
import classNames from 'classnames'
import styles from './Message.module.css'
import Button from './Button'
import { isSmallScreen } from '../utilities';

export default class Message extends Component {
  constructor() {
      super()
      this.state = ({
          animateEntry: !isSmallScreen(),
      })
  }

  componentDidUpdate() {
    this.setState(({animateEntry}) => animateEntry === false ? {animateEntry: true} : null)
  }

  render() {
    const {onClick, open, titleCount} = this.props
    const {animateEntry} = this.state
    const musicalNotes = String.fromCharCode(55356, 57270)
    return (
      <div className={classNames(styles.messageWrapper, {[styles.animateEntry]: animateEntry})}>
        <CSSTransition
        in={open}
        appear
        timeout={{enter: animateEntry ? 500 : 0, exit: 500}}
        classNames={{
          enter: styles['messageContainer-enter'],
          enterActive: styles['messageContainer-enter-active'],
          enterDone: styles['messageContainer-enter-done'],
          exit: styles['messageContainer-exit'],
          exitActive: styles['messageContainer-exit-active'],
          exitDone: styles['messageContainer-exit-done'],
        }}
      >
          <div className={styles.messageContainer}>
            <div className={styles.message}>
              <div className={styles.intro}>
                <div className={styles.heading}>
                  <div className={classNames(styles.notes, styles.left)}>{musicalNotes}</div>
                  <h1 className={styles.title}>{titleCount} Impromptus</h1>
                  <div className={classNames(styles.notes, styles.right)}>{musicalNotes}</div>
                </div>
                <div className={classNames(styles.details, styles.subheading)}>
                  <div>Interactive Music</div>
                  <div>By <Button type="link" href="http://robertkendall.com" target="_blank"
                             rel="noopener noreferrer" stopPropagation>Robert
                    Kendall</Button>
                  </div>
                </div>
                <div className={styles.details}>
                  <div className={styles.welcome}>Welcome to<br />Impromptu Music Making</div>
                </div>
                <div className={styles.instructions}>
                  <div>You are now a musical improviser with a wealth of sonic
                    ingredients at the service of your imagination.
                  </div>
                  <ul>
                    <li className={styles.mobile}>Turn on your phone's ringer.</li>
                    <li className={styles.mobile}>Tap or drag your finger to add and play your virtual instruments.</li>
                    <li className={styles.desktop}>Click the colored squares to play, or hold down the mouse button and
                      drag.
                    </li>
                    <li className={styles.mobile}>Swipe left at the bottom for more instruments.</li>
                    <li>Select a new piece from the menu on the left. There's one representing each time of day.</li>
                  </ul>
                  <Button className={styles.mobile} onClick={onClick} size="large">Start</Button>
                  <div className={classNames(styles.prompt, styles.desktop)}>Click anywhere to begin.</div>
                </div>
                <div className={styles.instructions}>
                  <div className={styles.advanced}>The Finer Points</div>
                  <ul>
                    <li className={styles.mobile}>Press and hold to loop the instrument. Tap to stop looping.</li>
                    <li className={styles.desktop}>Click and hold to loop the instrument. Click again to
                      stop looping.
                    </li>
                    <li>Glowing squares are taking a break for musical reasons.</li>
                    <li>Higher-pitched instruments are closer to the top.</li>
                    <li>Lighter colors generally have a more melodic role
                      than darker colors.
                    </li>
                    <li>Some pieces include Word Art, which you can enable with the <b>Word Art</b> checkbox at the left.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
      </CSSTransition>
      </div>
  )
  }
}