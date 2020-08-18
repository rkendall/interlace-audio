import React, {Component, Fragment, createRef} from 'react'
import classNames from 'classnames'
import {Element, scroller} from 'react-scroll'
import Hammer from 'hammerjs'
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import ChevronRight from '@material-ui/icons/ChevronRight'
import KeyboardArrowUp from '@material-ui/icons/KeyboardArrowUp'
import KeyboardArrowDown from '@material-ui/icons/KeyboardArrowDown'
import {AwesomeButton as Button} from 'react-awesome-button'
import 'react-awesome-button/dist/styles.css'
import './Sidebar.css'
import './Button.css'
import ToolTip, { hideTooltip } from './ToolTip';

class SideBar extends Component {
  constructor(props) {
    super(props)
    const {compositionTitles, initialSelectedValue} = props
    this.menu = createRef()
    const initialInd = compositionTitles.findIndex(({name}) => name === initialSelectedValue)
    const {hasPoetry} = compositionTitles[initialInd]
    this.state = {selectedInd: initialInd, poetrySelected: false, hasPoetry, isOpen: true}
  }

  componentDidMount() {
    const {selectedInd} = this.state
    this.scrollToSelection({selectedInd})
    const options = [...this.menu.current.children]
    options.forEach((child, ind) => {
      this.addTouchListeners(child, ind)
    })}

  componentDidUpdate(prevProps) {
    const {height, sidebarOpen} = this.props
    if (height !== prevProps.height) {
      const {selectedInd} = this.state
      this.scrollToSelection({selectedInd})
    }
    this.setState(({isOpen}) => sidebarOpen !== isOpen ? {isOpen: sidebarOpen} : null)
  }

  render() {
    const {onFadeSelected, onStopLooping, onToggleInstructions, toggleSidebar, compositionTitles, instructionsOpen} = this.props
    const {selectedInd, poetrySelected, hasPoetry, isOpen} = this.state
    const poetryAvailableTooltip = poetrySelected ? 'Turn Word Art off' : 'Add Word Art to the piece'
    const poetryTooltip = hasPoetry ? poetryAvailableTooltip : 'Sorry, no Word Art for this piece'
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
          <div className="sidebarChevron">
            <div className="close">{isOpen ? <ChevronLeft/> : <ChevronRight/>}</div>
          </div>
        </div>
        <div className="sidebar">
          <div className="titleBox">
            <h1 className="box heading">{`${compositionTitles.length} Impromptus`}</h1>
            <div className="box">
              <div className="byline">
                <div>By <a className="button" href="http://robertkendall.com" target="_blank" rel="noopener noreferrer">Robert
                  Kendall</a>
                </div>
              </div>
            </div>
          </div>
          <div className="box heading">Select an Impromptu</div>
          <button className="up arrow box" onClick={this.selectNextOrPrevious.bind(null, 'previous')}>
            <KeyboardArrowUp /></button>
          <div className="menuWrapper">
            <div id="menu" className="box menu" ref={this.menu}>
              {compositionTitles.map(({name, title}, ind) => (
                <div className={classNames('menuOption', {selected: ind === selectedInd})}
                     onMouseDown={this.onChange.bind(null, ind)} key={name}>
                  <Element name={name} key={name}>
                    <div className="optionText">
                      <div className="time">{this.getTimeForComposition(name)}</div>
                      <div className="title">{title}</div>
                    </div>
                  </Element>
                </div>
              ))}
            </div>
          </div>
          <button className="down arrow box" onClick={this.selectNextOrPrevious.bind(null, 'next')}>
            <KeyboardArrowDown /></button>
          <div className="box controls">
            <div className="instructions">Click and hold square to start/stop looping</div>
            <Button
              action={onStopLooping}
            >Stop All Looping
            </Button>
            <div className="selectOptions">
              <label data-tip="Try it and see" data-for='magicTip'>
                <input
                  name="fade"
                  type="checkbox"
                  onChange={this.fadeHandler}
                />
                <div className="label">Magic Vanishing Act</div>
              </label>
              <label className={hasPoetry ? '' : 'selectionDisabled'} data-tip={poetryTooltip} data-for='poetryTip'>
                  <input
                    name="poetry"
                    type="checkbox"
                    onChange={this.poetrySelectionHandler}
                    disabled={!hasPoetry}
                  />
                  <div className="label">Word Art</div>
                </label>

            </div>
            <button className="button help" onClick={onToggleInstructions}>{instructionsOpen ? 'Hide' : 'View'} Help
            </button>
          </div>
        </div>
        <ToolTip id="magicTip" disable={window.isTouchDevice}/>
        <ToolTip id="poetryTip" />
      </Fragment>
    )
  }

  addTouchListeners = (el, ind) => {
      const menuGestures = new Hammer(el);
      menuGestures.get('swipe').recognizeWith('tap').recognizeWith('press')
      menuGestures.get('press').set({time: 100}).requireFailure('swipe')
      menuGestures.get('tap').requireFailure('swipe')
      menuGestures.on('tap press swipe', event => {
        this.onChange(ind)
      })
  }

  scrollToSelection({selectedInd, animate = false}) {
    const options = animate ? {
      containerId: 'menu',
      smooth: 'easeInQuad',
      duration: 300,
      delay: 0,
      offset: -20,
    } : {smooth: false}
    options.containerId = 'menu'
    const {compositionTitles} = this.props
    const name = compositionTitles[selectedInd].name
    scroller.scrollTo(name, options)
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
    const {onChange, compositionTitles, allowMenuChange} = this.props
    this.setState(({selectedInd}) => {
      if (ind !== selectedInd && allowMenuChange) {
        const {name, hasPoetry} = compositionTitles[ind]
        onChange({id: name})
        window.location.hash = name
        // eslint-disable-next-line no-undef
        gtag('config', 'UA-173542609-1', {'page_path': `${window.location.pathname}${window.location.hash}`});
        return {selectedInd: ind, hasPoetry, isOpen: false}
      }
      return null
    })
  }

  fadeHandler = () => {
    const { onFadeSelected } = this.props
    onFadeSelected()
    hideTooltip()
  }

  poetrySelectionHandler = () => {
    const {onPoetrySelected} = this.props
    this.setState(({poetrySelected}) => ({poetrySelected: !poetrySelected}))
    onPoetrySelected()
    hideTooltip()
  }

  selectNextOrPrevious = type => {
    const {selectedInd: currentInd} = this.state
    const {compositionTitles} = this.props
    const lastInd = compositionTitles.length - 1
    const getPrevious = () => {
      const newInd = currentInd - 1
      return newInd >= 0 ? newInd : lastInd
    }
    const getNext = () => {
      const newInd = currentInd + 1
      return newInd <= lastInd ? newInd : 0
    }
    const selectedInd = type === 'previous' ? getPrevious() : getNext()
    this.scrollToSelection({selectedInd, animate: true})
    this.onChange(selectedInd)
  }

}

export default SideBar