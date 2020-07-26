import React from 'react'
import ReactTooltip from 'react-tooltip'

export default props => (
  <ReactTooltip
    {...props}
    place="right"
    effect="solid"
    delayShow={300}
    delayHide={100}
    backgroundColor="var(--peach)"
    arrowColor="var(--peach)"
    textColor="black"
    borderColor="gray"
    border
  />)