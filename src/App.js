import React, {Component} from 'react'
import Sidebar from 'react-sidebar'
import moment from 'moment'
import {detect} from 'detect-browser'
import ReactResizeDetector from 'react-resize-detector'
import SidebarContent from './components/Sidebar';
import MusicPane from './components/MusicPane'
import Message from './components/Message'
import './App.css'
import morning from './compositionConfigs/morning.json'
import noon from './compositionConfigs/noon.json'
import afternoon from './compositionConfigs/afternoon.json'
import night from './compositionConfigs/night.json'

const compositionData = [
  { morning },
  { noon },
  { afternoon },
  { night },
]
let rawCompositionTemp = {}
compositionData.forEach(async data => {
  rawCompositionTemp = {
    ...rawCompositionTemp,
    ...data,
  }
})
const rawCompositions = rawCompositionTemp

const compositionTitles = compositionData.map(data => {
  const name = Object.keys(data)[0]
  return {
    name,
    title: rawCompositions[name].title
  }
})


class App extends Component {
  constructor() {
    super()
    this.musicPaneRef = React.createRef();
    this.state = {
      currentCompositionName: this.selectCompositionByTimeOfDay(),
      sidebarOpen: true,
      squareCount: 0,
      fadeSquares: false,
    }
  }

  render() {
    const browser = detect()
    const isBrowsersupported = ['chrome', 'firefox'].includes(browser.name) && (browser.os === 'Mac OS' || /Windows/.test(browser.os))
    if (!isBrowsersupported) {
      alert('This site currently supports only Chrome and Firefox and does not support mobile devices.')
    }

    const { currentCompositionName, squareCount, fadeSquares, sidebarOpen } = this.state

    return (
      <div className="main">
        <Sidebar
          sidebar={<SidebarContent
            toggleSidebar={this.toggleSidebar}
            compositionTitles={compositionTitles}
            onChange={this.onCompositionSelected}
            onFadeSelected={this.onFadeSelected}
            selectedValue={currentCompositionName}
            sidebarOpen={sidebarOpen}
          />}
          open={sidebarOpen}
          docked={sidebarOpen}
          sidebarClassName="reactSidebar"
          contentClassName="sidebarContent"
        >
          <div className="content">
            <div ref={this.musicPaneRef} className="musicPaneContainer">
              <ReactResizeDetector handleWidth handleHeight onResize={this.getSquareCount} refreshMode="debounce" refreshRate={500}>
                <Message/>
                <MusicPane
                  currentCompositionName={currentCompositionName}
                  squareCount={squareCount}
                  rawCompositions={rawCompositions}
                  fadeSquares={fadeSquares}
                />
              </ReactResizeDetector>
            </div>
          </div>
        </Sidebar>
      </div>
    )
  }

  toggleSidebar = () => {
    const {sidebarOpen} = this.state
    this.setState({sidebarOpen: !sidebarOpen});
  }

  onCompositionSelected = ({value, id}) => {
    const selectedCompositionName = value || id
    if (selectedCompositionName && selectedCompositionName !== this.state.currentCompositionName) {
      this.setState({
        currentCompositionName: selectedCompositionName,
      })
    }
  }

  onFadeSelected = () => {
    this.setState({
      fadeSquares: !this.state.fadeSquares,
    })
  }

  selectCompositionByTimeOfDay = () => {
    const hour = moment().hour()
    let timeOfDay = null
    if (hour > 17 || hour < 5) {
      timeOfDay = 'night'
    } else if (hour > 12) {
      timeOfDay = 'afternoon'
    } else if (hour === 12) {
      timeOfDay = 'noon'
    } else {
      timeOfDay = 'morning'
    }
    return timeOfDay
  }

  getSquareCount= (width, height) => {
    const rowSize = Math.floor(width / 80)
    const columnSize = Math.floor(height / 80)
    const newSquareCount = rowSize * columnSize
    if (newSquareCount !== this.state.squareCount) {
      this.setState({
        squareCount: newSquareCount,
      })
    }
  }

}

export default App
