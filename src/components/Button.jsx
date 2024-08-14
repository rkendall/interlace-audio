import React, { createRef } from 'react'
import classNames from 'classnames'
import styles from './Button.module.css'

export default props => {
  const {type = 'button', size = 'medium', className, stopPropagation, ...rest} = props
  const Tag = type === 'button' ? 'button' : 'a'
  const link = createRef()
  const {onClick} = rest

  if (stopPropagation) {
    const clickHandler = event => {
      event.stopPropagation()
      if (onClick) {
        onClick(event)
      }
    }
    rest.onClick = clickHandler
  }

  return <Tag className={classNames(className, styles.default, styles[type], {[styles.large]: size === 'large'}, {[styles.desktop]: !window.isTouchDevice})} {...rest} ref={link} />
}