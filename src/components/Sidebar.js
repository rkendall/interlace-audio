import React, {Fragment} from 'react'
import {SideNav, Nav} from 'react-sidenav'
import classNames from 'classnames';
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import ChevronRight from '@material-ui/icons/ChevronRight'
import {AwesomeButton as Button} from 'react-awesome-button'
import 'react-awesome-button/dist/styles.css'
import './Sidebar.css'

const menuTheme = {
  selectionBgColor: '#e5e1e8',
  hoverBgColor: '#d0cdd7',
}

export default ({onChange, onFadeSelected, onStopLooping, toggleSidebar, selectedValue, compositionTitles, sidebarOpen}) => {
  return (
    <Fragment>
      <div className="rightTab" onClick={toggleSidebar}>
        <div className="ranges">
          <div>High</div>
          <div>Mid-Range</div>
          <div>Low</div>
        </div>
        <div className="header">
          <div className="close">{sidebarOpen ? <ChevronLeft/> : <ChevronRight/>}</div>
        </div>
      </div>
      <div className={classNames('sidebar', {closed: !sidebarOpen})}>
        <div className="top">
          <div>
            <div className="box">
              <h1>Impromptus</h1>
              <div className="byline">
                <div>Interactive Music</div>
                <div>By Robert Kendall</div>
              </div>
            </div>
            <div className="box menu">
              <div className="prompt">Select an Impromptu</div>
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
            </div>
            <div className="box description">
              <p>To play, click colored squares or hold
                down the mouse button and drag.</p>
              <p>Glowing squares are temporarily disabled for musical reasons.</p>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}