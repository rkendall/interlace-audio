import React, {Fragment} from 'react'
import {SideNav, Nav} from 'react-sidenav'
import classNames from 'classnames';
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import ChevronRight from '@material-ui/icons/ChevronRight'
import {AwesomeButton as Button} from 'react-awesome-button'
import 'react-awesome-button/dist/styles.css'
import './Sidebar.css'
import './Button.css'

const menuTheme = {
  selectionBgColor: '#e5e1e8',
  hoverBgColor: '#d0cdd7',
}

export default ({onChange, onFadeSelected, onStopLooping, onToggleInstructions, toggleSidebar, selectedValue, compositionTitles, sidebarOpen, instructionsOpen}) => {
  return (
    <Fragment>
      <div className="rightTab" onClick={() => {toggleSidebar()}}>
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
        <div className="box heading">
          <h1>Impromptus</h1>
          <div className="byline">
            <div>Interactive Music</div>
            <div>By <a href="http://robertkendall.com" target="_blank">Robert Kendall</a></div>
          </div>
        </div>
        <div className="box menu">
          <div className="prompt">Select an Impromptu</div>
          <div className="menuOptions">
            <SideNav
              selectedPath={selectedValue}
              onItemSelection={onChange}
              theme={menuTheme}
            >
              {compositionTitles.map(({name, title}, ind) => (
                <Nav className="menuOption" id={name} key={name}>
                  <div className="optionText">{`${ind + 1}. ${title}`}</div>
                </Nav>
              ))}
            </SideNav>
          </div>
        </div>
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