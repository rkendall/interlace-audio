import React, {Fragment} from 'react'
import {SideNav, Nav} from 'react-sidenav'
import classNames from 'classnames';
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import ChevronRight from '@material-ui/icons/ChevronRight'
import './Sidebar.css'

const menuTheme = {
  selectionBgColor: '#d6f2fb',
  hoverBgColor: '#ececec',
}

export default ({onChange, onFadeSelected, toggleSidebar, selectedValue, compositionTitles, sidebarOpen}) => {
  return (
    <Fragment>
      <div className="header">
        <div className="close" onClick={toggleSidebar}>{sidebarOpen ? <ChevronLeft/> : <ChevronRight/>}</div>
      </div>
      <div className={classNames('sidebar', {closed: !sidebarOpen})}>
        <div className="top">
          <div>
            <div className="box">
              <h1>Four Impromptus</h1>
              <h2>Interactive Music</h2>
              <div className="byline">By Robert Kendall</div>
            </div>
            <div className="box">
              <div className="prompt">Select One</div>
              <SideNav
                selectedPath={selectedValue}
                onItemSelection={onChange}
                theme={menuTheme}
              >
                {compositionTitles.map(({name, title}, ind) => (
                  <Nav className="menuOption" id={name} key={name}>{`${ind + 1}. ${title}`}</Nav>
                ))}
              </SideNav>
            </div>
            <div className="box selectFade">
              <label>
                <input
                  name="fade"
                  type="checkbox"
                  onChange={onFadeSelected}
                />
                <span className="fadeSquaresLabel">Evaporation</span>
              </label>
            </div>
            <div className="box">
              <p>Click on squares to play individual instruments. To play multiple instruments at once, hold
                down the mouse button and drag the pointer over multiple squares.
                The colors denote different types of instruments.
                Some limits are placed on the number of instruments that can play at once, and
                glowing squares indicate instruments that are temporarily restricted from playing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}