import React, {Component, Fragment, createRef} from 'react'
import classNames from 'classnames'
import {Element, scroller} from 'react-scroll'
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import ChevronRight from '@material-ui/icons/ChevronRight'
import KeyboardArrowUp from '@material-ui/icons/KeyboardArrowUp'
import KeyboardArrowDown from '@material-ui/icons/KeyboardArrowDown'
import {AwesomeButton as Button} from 'react-awesome-button'
import 'react-awesome-button/dist/styles.css'
import './Sidebar.css'
import './Button.css'

class SideBar extends Component {
  constructor(props) {
    super(props)
    const {compositionTitles, initialSelectedValue} = props
    this.menu = createRef()
    const initialInd = compositionTitles.findIndex(({name}) => name === initialSelectedValue)
    this.state = {selectedInd: initialInd}
  }

  componentDidMount() {
    const {selectedInd} = this.state
    const {compositionTitles} = this.props
    scroller.scrollTo(compositionTitles[selectedInd].name, {
      containerId: 'menu',
      smooth: false,
    })
  }

  componentDidUpdate(prevProps, prevState) {
    const {selectedInd} = this.state
    const {height} = this.props
    const {onChange} = this.props
    if (selectedInd === prevState.selectedInd && height === prevProps.height) {
      return
    }
    const {compositionTitles} = this.props
    const name = compositionTitles[selectedInd].name
    scroller.scrollTo(name, {
      containerId: 'menu',
      smooth: 'easeInQuad',
      duration: 300,
      delay: 0,
      offset: -20,
    })
    onChange({id: name})
  }

  render() {
    const {onFadeSelected, onStopLooping, onToggleInstructions, toggleSidebar, compositionTitles, sidebarOpen, instructionsOpen} = this.props
    const {selectedInd} = this.state
    return (
      <Fragment>
        <div className="rightTab" onClick={() => {
          toggleSidebar()
        }}>
          <div className="ranges">
            <div className="rangeItem">
              <div className="rangeLabel">High</div>
            </div>
            <div className="rangeItem">
              <div className="rangeLabel">Mid-Range</div>
            </div>
            <div className="rangeItem">
              <div className="rangeLabel">Low</div>
            </div>
          </div>
          <div className="header">
            <div className="close">{sidebarOpen ? <ChevronLeft/> : <ChevronRight/>}</div>
          </div>
        </div>
        <div className={classNames('sidebar', {closed: !sidebarOpen})}>
          <h1 className="box heading">{`${compositionTitles.length} Impromptus`}</h1>
          <div className="box">
            <div className="byline">
              <div>Interactive Music</div>
              <div>By <a href="http://robertkendall.com" target="_blank">Robert Kendall</a></div>
            </div>
          </div>
          <div className="box heading">Select an Impromptu</div>
          <button className="up arrow box" onClick={this.selectPrevious}><KeyboardArrowUp /></button>
          <div id="menu" className="box menu" ref={this.menu}>
              {compositionTitles.map(({name, title}, ind) => (
                <div className={classNames('menuOption', {selected: ind === selectedInd})} onMouseDown={this.onChange.bind(null, ind)} key={name}>
                  <Element name={name} key={name}>
                      <div className="optionText"><div className="time">{this.getTimeForComposition(name)}</div> <div className="title">{title}</div></div>
                  </Element>
                </div>
              ))}
          </div>
          <button className="down arrow box" onClick={this.selectNext}><KeyboardArrowDown /></button>
          <div className="box controls">
            <div className="instructions">Click and hold on a square to start/stop looping</div>
            <Button
              action={onStopLooping}
            >Stop All Looping
            </Button>
            <div className="selectFade">
              <label>
                <input
                  name="fade"
                  type="checkbox"
                  onChange={onFadeSelected}
                />
                <span className="label">Magic Vanishing Act</span>
              </label>
            </div>
            <button className="button" onClick={onToggleInstructions}>{instructionsOpen ? 'Hide' : 'View'} Help</button>
          </div>
        </div>
      </Fragment>
    )
  }

  getTimeForComposition = name => {
    const {timeSlots} = this.props
    const timeSlot = timeSlots[name]
    let time = timeSlot
    if (timeSlot > 12) {
      time = timeSlot - 12
    } else if (timeSlot === 0) {
      time = 12
    }
    return `${time}:00`
  }

  onChange = ind => {
    this.setState(({selectedInd}) => {
      return ind !== selectedInd ? {selectedInd: ind} : null
    })
  }

  selectPrevious = () => {
    const {selectedInd} = this.state
    this.onChange(Math.max(selectedInd - 1, 0))
  }

  selectNext = () => {
    const {compositionTitles} = this.props
    const {selectedInd} = this.state
    this.onChange(Math.min(selectedInd + 1, compositionTitles.length - 1))
  }

}

export default SideBar