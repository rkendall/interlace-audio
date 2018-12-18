import React from 'react'
import {SideNav, Nav} from 'react-sidenav'
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import './Sidebar.css'

const menuTheme = {
  selectionBgColor: '#d6f2fb',
  hoverBgColor: '#ececec',
}

export default ({onChange, onFadeSelected, closeSidebar, selectedValue, compositionTitles}) => {
  return (
    <div className="sidebar">
      <div className="top">
        <div>
          <div className="box">
            <h1>Four Impromptus</h1>
            <h2>Interactive Music</h2>
            <div className="byline">By Robert Kendall</div>
          </div>
          <div className="box">
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
          <div className="box">
            <p>Click on squares to play individual instruments. To play multiple instruments at once, hold
              down the mouse button and drag the pointer over multiple squares.
              The colors denote different types of instruments.</p>
          </div>
          <div className="box selectFade">
            <label>
              <input
                name="fade"
                type="checkbox"
                onChange={onFadeSelected}
              />
              <span className="fadeSquaresLabel">Fade squares out</span>
            </label>
          </div>
        </div>
        <div className="header">
          <div className="close" onClick={closeSidebar}><ChevronLeft/></div>
        </div>
      </div>
    </div>
  )
}