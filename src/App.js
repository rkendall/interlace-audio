import React, {Component} from 'react'
import Sidebar from 'react-sidebar'
import moment from 'moment'
import {detect} from 'detect-browser'
import ReactResizeDetector from 'react-resize-detector'
import SidebarContent from './components/Sidebar';
import MusicPane from './components/MusicPane'
import Message from './components/Message'
import './App.css'
import aubade from './compositionConfigs/audbade.json'
import afterCoffee from './compositionConfigs/afterCoffee.json'
import noon from './compositionConfigs/noon.json'
import afternoon from './compositionConfigs/afternoon.json'
import night from './compositionConfigs/night.json'
import afterMidnight from './compositionConfigs/afterMidnight.json'
import eveningEmbers from './compositionConfigs/eveningEmbers.json'
import glassDreams from './compositionConfigs/glassDreams.json'
import midnightBlues from './compositionConfigs/midnightBlues.json';

const compositionData = [
  {glassDreams},
  {aubade},
  {afterCoffee},
  {noon},
  {afternoon},
  {eveningEmbers},
  {night},
  {midnightBlues},
  {afterMidnight},
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
      vanishSquares: false,
      stopLooping: false,
    }
  }

  componentDidUpdate() {
    const {stopLooping} = this.state
    if (stopLooping) {
      this.resetStopLooping()
    }
  }

  render() {
    const browser = detect()
    const isBrowsersupported = ['chrome', 'firefox'].includes(browser.name) && (browser.os === 'Mac OS' || /Windows/.test(browser.os))
    if (!isBrowsersupported) {
      alert('This site currently supports only Chrome and Firefox and does not support mobile devices.')
    }

    const {currentCompositionName, squareCount, vanishSquares, sidebarOpen, stopLooping} = this.state

    return (
      <div className="main">
        <Sidebar
          sidebar={<SidebarContent
            toggleSidebar={this.toggleSidebar}
            compositionTitles={compositionTitles}
            onChange={this.onCompositionSelected}
            onFadeSelected={this.onFadeSelected}
            onStopLooping={this.onStopLooping}
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
              <ReactResizeDetector handleWidth handleHeight onResize={this.getSquareCount} refreshMode="debounce"
                                   refreshRate={500}>
                <Message/>
                <MusicPane
                  currentCompositionName={currentCompositionName}
                  squareCount={squareCount}
                  rawCompositions={rawCompositions}
                  vanishSquares={vanishSquares}
                  stopLooping={stopLooping}
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
      vanishSquares: !this.state.vanishSquares,
    })
  }

  onStopLooping = () => {
    this.setState({
      stopLooping: true,
    })
  }

  resetStopLooping = () => {
    this.setState({
      stopLooping: false,
    })
  }

  selectCompositionByTimeOfDay = () => {
    const hour = moment().hour()
    const timeSlots =
    {
      afterMidnight: 1,
      glassDreams: 2,
      aubade: 5,
      afterCoffee: 9,
      noon: 12,
      afternoon: 13,
      eveningEmbers: 18,
      night: 21,
      midnightBlues: 0,
    }
    const compositionName = Object.keys(timeSlots).find((name, ind, arr) => {
      const compTime = timeSlots[name]
      const nextTimeKey = arr[ind + 1] || arr[0]
      const nextCompTime = ind === arr.length - 2 ? 24 : timeSlots[nextTimeKey]
      return compTime <= hour && hour < nextCompTime
    }) || Object.keys(timeSlots)[0]
    return compositionName
  }

  getSquareCount = (width, height) => {
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
