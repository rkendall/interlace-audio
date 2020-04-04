import React, {Component} from 'react'
import Sidebar from 'react-sidebar'
import moment from 'moment'
import {detect} from 'detect-browser'
import ReactResizeDetector from 'react-resize-detector'
import SidebarContent from './components/Sidebar';
import MusicPane from './components/MusicPane'
import Message from './components/Message'
import './App.css'
import aubade from './compositionConfigs/morning.json'
import afterCoffee from './compositionConfigs/morning2.json'
import noon from './compositionConfigs/noon.json'
import afternoon from './compositionConfigs/afternoon.json'
import night from './compositionConfigs/night.json'
import afterMidnight from './compositionConfigs/afterMidnight.json'
import eveningEmbers from './compositionConfigs/impromptu4.json'

const compositionData = [
  {aubade},
  {afterCoffee},
  {noon},
  {afternoon},
  {eveningEmbers},
  {night},
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
      fadeSquares: false,
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

    const {currentCompositionName, squareCount, fadeSquares, sidebarOpen, stopLooping} = this.state

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
                  fadeSquares={fadeSquares}
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
      fadeSquares: !this.state.fadeSquares,
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
    const currentHour = hour === 24 ? 0 : hour
    const timeSlots =
    {
      audabe: 5,
      afterCoffe: 9,
      noon: 12,
      afternoon: 13,
      eveningEmbers: 18,
      night: 21,
      afterMidnight: 0
    }
    return Object.keys(timeSlots).find((name, ind, arr) => {
      const compTime = timeSlots[name]
      const nextTimeKey = arr[ind + 1] || arr[0]
      const nextCompTime = timeSlots[nextTimeKey]
      return compTime >= currentHour && compTime < nextCompTime
    })
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
