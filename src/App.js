import React, {Component} from 'react'
import Sidebar from 'react-sidebar'
import moment from 'moment'
import TinyGesture from 'tinygesture'
import ReactResizeDetector from 'react-resize-detector'
import ChevronLeft from '@material-ui/icons/ChevronLeft'
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
import commuterProcessional from './compositionConfigs/commuterProcessional.json'
import commuterProcessionalPoem from './poems/commuterProcessional'
import downToBusiness from './compositionConfigs/downToBusiness.json'
import reverie from './compositionConfigs/reverie.json'
import danceOfTheAfternoonShadows from './compositionConfigs/danceOfTheAfternoonShadows.json'
import siesta from './compositionConfigs/siesta.json'
import fiesta from './compositionConfigs/fiesta.json'
import fiestaPoem from './poems/fiesta'
import nocturne from './compositionConfigs/nocturne.json'
import tableMusic from './compositionConfigs/tableMusic.json'
import teatime from './compositionConfigs/teatime.json'
import rushHour from './compositionConfigs/rushHour.json'
import tunesOnTap from './compositionConfigs/tunesOnTap.json'
import treadmillToccata from './compositionConfigs/treadmillToccata.json'
import apollosExitAria from './compositionConfigs/apollosExitAria.json'
import eveningEmbers from './compositionConfigs/eveningEmbers.json'
import twilitBallad from './compositionConfigs/twilitBallad.json'
import elegyForTheDaylight from './compositionConfigs/elegyForTheDaylight.json'
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
  {commuterProcessional},
  {downToBusiness},
  {reverie},
  {tableMusic},
  {danceOfTheAfternoonShadows},
  {siesta},
  {fiesta},
  {teatime},
  {rushHour},
  {tunesOnTap},
  {apollosExitAria},
  {eveningEmbers},
  {twilitBallad},
  {elegyForTheDaylight},
  {nocturne},
  {midnightBlues},
]

const poems = {ironDreamsPoem, commuterProcessionalPoem, fiestaPoem}

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
  commuterProcessional: 9,
  downToBusiness: 10,
  reverie: 11,
  tableMusic: 12,
  danceOfTheAfternoonShadows: 13,
  siesta: 14,
  fiesta: 15,
  teatime: 16,
  rushHour: 17,
  tunesOnTap: 18,
  apollosExitAria: 19,
  eveningEmbers: 20,
  twilitBallad: 21,
  elegyForTheDaylight: 22,
  nocturne: 23,
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
  const {title, poem} = rawCompositions[name]
  return {
    name,
    title,
    hasPoetry: Boolean(poem),
  }
})


class App extends Component {
  constructor() {
    super()
    this.musicPaneRef = React.createRef()
    this.state = {
      currentCompositionName: this.selectCompositionByHash() || this.selectCompositionByTimeOfDay(),
      sidebarOpen: true,
      instructionsOpen: true,
      squareCount: 0,
      vanishSquares: false,
      stopLooping: false,
      height: null,
      showPoetry: false,
    }
  }


  componentDidMount() {
    window.isTouchDevice = 'ontouchstart' in window
    if (!window.isTouchDevice) {
      return
    }
    const gesture = new TinyGesture(document.getElementById('sidebar'), {
      threshold: () => 1,
      velocityThreshold: 1,
      disregardVelocityThreshold: () => 1,
    })
    gesture.on('panmove', event => {
      const {sidebarOpen} = this.state
      if (!sidebarOpen) {
        this.toggleSidebar(true)
      }
    })
    gesture.on('swipeleft', event => {
      this.toggleSidebar(false)
    })
  }

  componentDidUpdate() {
    const {stopLooping} = this.state
    if (stopLooping) {
      this.resetStopLooping()
    }
  }

  render() {
    const {currentCompositionName, squareCount, vanishSquares, showPoetry, sidebarOpen, instructionsOpen, stopLooping, height} = this.state

    return (
      <div className="main">
        <Message open={instructionsOpen} onClick={this.onMessageClose} titleCount={compositionTitles.length}/>
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
            />}
            open={sidebarOpen}
            docked={sidebarOpen}
            sidebarId="sidebar"
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
              <div className="scroller"><ChevronLeft/> <ChevronLeft/>
                <div className="swipe">Swipe for more instruments</div>
              </div>
            </div>
          </Sidebar>
      </div>
    )
  }

  onResize = (width, height) => {
    const root = document.documentElement
    root.style.setProperty('--windowHeight', `${height}px`);
    this.getSquareCount(width, height)
    this.setState({height})
  }

  onPlayStarted = () => {
    if (window.innerWidth < 768) {
      this.toggleSidebar(false)
    }
  }

  onMessageClose = () => {
    this.onCloseInstructions()
    this.onPlayStarted()
  }

  toggleSidebar = sidebarState => {
    this.setState(({sidebarOpen}) => {
      if (sidebarState === undefined) {
        return {sidebarOpen: !sidebarOpen}
      }
      if (sidebarOpen !== sidebarState) {
        return {sidebarOpen: sidebarState}
      }
      return null
    })
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

  onPoetrySelected = () => {
    this.setState({
      showPoetry: !this.state.showPoetry,
    })
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

  selectCompositionByHash = () => {
    const hash = window.location.hash.replace('#', '')
    return timeSlots[hash] ? hash : null
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
