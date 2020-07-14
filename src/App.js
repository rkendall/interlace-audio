import React, {Component} from 'react'
import Sidebar from 'react-sidebar'
import moment from 'moment'
import ReactResizeDetector from 'react-resize-detector'
import SidebarContent from './components/Sidebar'
import MusicPane from './components/MusicPane'
import Message from './components/Message'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

import waterDreams from './compositionConfigs/waterDreams.json'
import glassDreams from './compositionConfigs/glassDreams.json'
import ironDreams from './compositionConfigs/ironDreams.json'
import ironDreamsPoem from './poems/ironDreams'
import bumpsInTheNight from './compositionConfigs/bumpsInTheNight.json'
import dreamlandRushHour from './compositionConfigs/dreamlandRushHour.json'
import aubade from './compositionConfigs/audbade.json'
import afterCoffee from './compositionConfigs/afterCoffee.json'
import promenade from './compositionConfigs/promenade.json'
import downToBusiness from './compositionConfigs/downToBusiness.json'
import reverie from './compositionConfigs/reverie.json'
import afternoon from './compositionConfigs/afternoon.json'
import night from './compositionConfigs/night.json'
import tableMusic from './compositionConfigs/tableMusic.json'
import teatime from './compositionConfigs/teatime.json'
import rushHour from './compositionConfigs/rushHour.json'
import tunesOnTap from './compositionConfigs/tunesOnTap.json'
import treadmillToccata from './compositionConfigs/treadmillToccata.json'
import siesta from './compositionConfigs/siesta.json'
import fiesta from './compositionConfigs/fiesta.json'
import apollosExitAria from './compositionConfigs/apollosExitAria.json'
import eveningEmbers from './compositionConfigs/eveningEmbers.json'
import twilitBallad from './compositionConfigs/twilitBallad.json'
import darkSerenade from './compositionConfigs/darkSerenade.json'
import midnightBlues from './compositionConfigs/midnightBlues.json'

const compositionData = [
  {waterDreams},
  {glassDreams},
  {ironDreams},
  {bumpsInTheNight},
  {dreamlandRushHour},
  {aubade},
  {afterCoffee},
  {treadmillToccata},
  {promenade},
  {downToBusiness},
  {reverie},
  {tableMusic},
  {afternoon},
  {siesta},
  {fiesta},
  {teatime},
  {rushHour},
  {tunesOnTap},
  {apollosExitAria},
  {eveningEmbers},
  {twilitBallad},
  {darkSerenade},
  {night},
  {midnightBlues},
]

const poems = {ironDreamsPoem}

const timeSlots =
{
  waterDreams: 1,
  glassDreams: 2,
  ironDreams: 3,
  bumpsInTheNight: 4,
  dreamlandRushHour: 5,
  aubade: 6,
  afterCoffee: 7,
  treadmillToccata: 8,
  promenade: 9,
  downToBusiness: 10,
  reverie: 11,
  tableMusic: 12,
  afternoon: 13,
  siesta: 14,
  fiesta: 15,
  teatime: 16,
  rushHour: 17,
  tunesOnTap: 18,
  apollosExitAria: 19,
  eveningEmbers: 20,
  twilitBallad: 21,
  darkSerenade: 22,
  night: 23,
  midnightBlues: 0,
}

let rawCompositionTemp = {}
compositionData.forEach(async data => {
  const [name, value] = Object.entries(data)[0]
  const poem = poems[`${name}Poem`] || null
  if (poem) {
    value.poem = poem
  }
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
      instructionsOpen: true,
      squareCount: 0,
      vanishSquares: false,
      stopLooping: false,
      height: null,
      showPoetry: false,
      isPoetry: false,
    }
  }

  componentDidMount() {
    window.isTouchDevice = 'ontouchstart' in window
  }

  componentDidUpdate() {
    const {stopLooping} = this.state
    if (stopLooping) {
      this.resetStopLooping()
    }
  }

  render() {
    const {currentCompositionName, squareCount, vanishSquares, showPoetry, isPoetry, sidebarOpen, instructionsOpen, stopLooping, height} = this.state

    return (
      <div className="main">
        <Message open={instructionsOpen} onClick={this.onMessageClose}/>
        <Sidebar
          sidebar={<SidebarContent
            toggleSidebar={this.toggleSidebar}
            compositionTitles={compositionTitles}
            timeSlots={timeSlots}
            onChange={this.onCompositionSelected}
            onFadeSelected={this.onFadeSelected}
            onPoetrySelected={this.onPoetrySelected}
            onStopLooping={this.onStopLooping}
            onToggleInstructions={this.onToggleInstructions}
            instructionsOpen={instructionsOpen}
            initialSelectedValue={currentCompositionName}
            sidebarOpen={sidebarOpen}
            height={height}
            isPoetry={isPoetry}
          />}
          open={sidebarOpen}
          docked={sidebarOpen}
          sidebarClassName="reactSidebar"
          contentClassName="sidebarContent"
        >
          <div className="content">
            <div ref={this.musicPaneRef} className="musicPaneContainer">
              <ReactResizeDetector handleWidth handleHeight onResize={this.onResize} refreshMode="debounce"
                                   refreshRate={500}>
                <ErrorBoundary>
                  <MusicPane
                    currentCompositionName={currentCompositionName}
                    squareCount={squareCount}
                    rawCompositions={rawCompositions}
                    vanishSquares={vanishSquares}
                    stopLooping={stopLooping}
                    onPlayStarted={this.onPlayStarted}
                    showPoetry={showPoetry}
                    onPoemInitialized={this.onPoemInitialized}
                  />
                </ErrorBoundary>
              </ReactResizeDetector>
            </div>
          </div>
        </Sidebar>
           </div>
    )
  }

  toggleTimer = null

  onResize = (width, height) => {
    const root = document.documentElement
    root.style.setProperty('--windowHeight', `${height}px`);
    this.getSquareCount(width, height)
    this.setState({height})
  }

  onPlayStarted = () => {
    if (window.innerWidth < 768) {
      this.toggleTimer = setTimeout(() => {
        this.toggleSidebar(false)
      }, 1000)
    }
  }

  onMessageClose = () => {
    this.onCloseInstructions()
    this.onPlayStarted()
  }

  toggleSidebar = sidebarState => {
    const {sidebarOpen} = this.state
    if (sidebarOpen === sidebarState) {
      return
    }
    clearTimeout(this.toggleTimer)
    this.setState({sidebarOpen: sidebarState !== undefined ? sidebarState : !sidebarOpen});
  }

  onCompositionSelected = ({value, id}) => {
    const selectedCompositionName = value || id
    if (selectedCompositionName && selectedCompositionName !== this.state.currentCompositionName) {
      this.onCloseInstructions()
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

  onPoetrySelected = value => {
    this.setState({
      showPoetry: !this.state.showPoetry,
    })
  }

  onPoemInitialized = isPoetry => {
    this.setState(({isPoetry: currentStatus}) => currentStatus !== isPoetry ? {isPoetry} : null)
  }

  onStopLooping = () => {
    this.setState({
      stopLooping: true,
    })
  }

  onCloseInstructions = () => {
    this.setState({instructionsOpen: false})
  }

  onToggleInstructions = () => {
    this.setState(({instructionsOpen}) => {
      return {
        instructionsOpen: !instructionsOpen,
      }
    })
  }

  resetStopLooping = () => {
    this.setState({
      stopLooping: false,
    })
  }

  selectCompositionByTimeOfDay = () => {
    const hour = moment().hour()
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
