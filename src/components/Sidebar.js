import React, {Fragment} from 'react'
import {SideNav, Nav} from 'react-sidenav'
import classNames from 'classnames';
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import ChevronRight from '@material-ui/icons/ChevronRight'
import { AwesomeButton as Button } from 'react-awesome-button'
import 'react-awesome-button/dist/styles.css'
import './Sidebar.css'

const menuTheme = {
  selectionBgColor: '#e5e1e8',
  hoverBgColor: '#d0cdd7',
}

export default ({onChange, onFadeSelected, onStopLooping, toggleSidebar, selectedValue, compositionTitles, sidebarOpen}) => {
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
            <div className="box menu">
              <div className="prompt">Select Music</div>
              <SideNav
                selectedPath={selectedValue}
                onItemSelection={onChange}
                theme={menuTheme}
              >
                {compositionTitles.map(({name, title}, ind) => (
                  <Nav className="menuOption" id={name} key={name}><div className="optionText">{`${ind + 1}. ${title}`}</div></Nav>
                ))}
              </SideNav>
            </div>
            <div className="box controls">
                <Button
                  action={onStopLooping}
                >Stop Looping
              </Button>
              <div className="selectFade">
                <label>
                  <input
                    name="fade"
                    type="checkbox"
                    onChange={onFadeSelected}
                  />
                  <span className="label">Evaporate</span>
                </label>
              </div>
            </div>
            <div className="box description">
                <p>Click squares to play. Colors denote types of instruments.</p>
                <p>To play multiple instruments, hold
                down the mouse button and drag the pointer.</p>
                <p>Glowing instruments are temporarily disabled (for musical reasons).</p>
                <p>To loop an instrument, hold down the mouse button.
                  Click and hold again to stop looping.</p>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}