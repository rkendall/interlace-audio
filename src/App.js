import React, {Component} from 'react'
import Sidebar from 'react-sidebar'
import moment from 'moment'
import TinyGesture from 'tinygesture'
import ReactResizeDetector from 'react-resize-detector'
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import ChevronRight from '@material-ui/icons/ChevronRight'
import SidebarContent from './components/Sidebar'
import MusicPane from './components/MusicPane'
import Message from './components/Message'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'
import {isSmallScreen} from './utilities'
import mode from './mode'

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
import reveriePoem from './poems/reverie'
import danceOfTheAfternoonShadows from './compositionConfigs/danceOfTheAfternoonShadows.json'
import siesta from './compositionConfigs/siesta.json'
import fiesta from './compositionConfigs/fiesta.json'
import fiestaPoem from './poems/fiesta'
import nocturne from './compositionConfigs/nocturne.json'
import tableMusic from './compositionConfigs/tableMusic.json'
import teatime from './compositionConfigs/teatime.json'
import rushHour from './compositionConfigs/rushHour.json'
import tunesOnTap from './compositionConfigs/tunesOnTap.json'
import tunesOnTapPoem from './poems/tunesOnTap'
import treadmillToccata from './compositionConfigs/treadmillToccata.json'
import apollosExitAria from './compositionConfigs/apollosExitAria.json'
import eveningEmbers from './compositionConfigs/eveningEmbers.json'
import eveningEmbersPoem from './poems/eveningEmbers'
import twilitBallad from './compositionConfigs/twilitBallad.json'
import twilitBalladPoem from './poems/twilitBallad'
import elegyForTheDaylight from './compositionConfigs/elegyForTheDaylight.json'
import elegyForTheDaylightPoem from './poems/elegyForTheDaylight'
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

const poems = {
  ironDreamsPoem,
  commuterProcessionalPoem,
  fiestaPoem,
  eveningEmbersPoem,
  reveriePoem,
  tunesOnTapPoem,
  elegyForTheDaylightPoem,
  twilitBalladPoem,
}

const timeSlots = {
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
      initialized: false,
      currentCompositionName: this.selectCompositionByHash() || this.selectCompositionByTimeOfDay(),
      sidebarOpen: true,
      messageOpen: true,
      squareCount: 0,
      vanishSquares: false,
      stopLooping: false,
      showAllSquares: false,
      height: null,
      showPoetry: false,
      allowMenuChange: true,
    }
    this.toggleTimer = null

  }

  componentDidMount() {
    if (mode === 'installation') {
      setInterval(() => {
        if (!this.selectCompositionByHash()) {
          const newCompositionName = this.selectCompositionByTimeOfDay()
          this.setState(({currentCompositionName}) => newCompositionName !== currentCompositionName ? {currentCompositionName: newCompositionName} : null)
        }
      }, 5000)
    }
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
    const {stopLooping, showAllSquares, allowMenuChange} = this.state
    if (stopLooping) {
      this.resetStopLooping()
    }
    if (showAllSquares) {
      this.resetShowAllSquares()
    }
    if (!allowMenuChange) {
      this.toggleTimer = setTimeout(() => {
        this.setState({allowMenuChange: true})
      }, 300)
    }
  }

  render() {
    const {currentCompositionName, squareCount, showAllSquares, vanishSquares, showPoetry, smartLooping, sidebarOpen, messageOpen, stopLooping, height, allowMenuChange} = this.state
    const mainProps = {}
    if (!isSmallScreen()) {
      mainProps.onClick = this.onInteraction
    }

    return (
      <div className="main" {...mainProps}>
        {mode === 'application' && <Message open={messageOpen} onClick={this.closeMessage} titleCount={compositionTitles.length}/>}
        <Sidebar
          sidebar={<SidebarContent
            toggleSidebar={this.toggleSidebar}
            compositionTitles={compositionTitles}
            timeSlots={timeSlots}
            allowMenuChange={allowMenuChange}
            onChange={this.onCompositionSelected}
            onSmartLoopingSelected={this.onSmartLoopingSelected}
            onFadeSelected={this.onFadeSelected}
            onPoetrySelected={this.onPoetrySelected}
            onStopLooping={this.onStopLooping}
            onShowAllSquares={this.onShowAllSquares}
            toggleMessageHandler={this.toggleMessage}
            messageOpen={messageOpen}
            initialSelectedValue={currentCompositionName}
            sidebarOpen={sidebarOpen}
            height={height}
          />}
          open={mode === 'application' ? sidebarOpen : true}
          docked={sidebarOpen}
          touchHandleWidth={50}
          dragToggleDistance={10}
          touch={false}
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
                    smartLooping={smartLooping}
                    vanishSquares={vanishSquares}
                    stopLooping={stopLooping}
                    showAllSquares={showAllSquares}
                    onPlayStarted={this.onPlayStarted}
                    showPoetry={showPoetry}
                    onPoemInitialized={this.onPoemInitialized}
                  />
                </ErrorBoundary>
              </ReactResizeDetector>
            </div>
            <div className="scrollers">
              <div className="scroller"><ChevronLeft/> <ChevronLeft/>
                <div className="swipe">Swipe left for more instruments</div>
              </div>
              <div className="scroller">
                <div className="swipe">Swipe right for more instruments</div><ChevronRight/> <ChevronRight/>
              </div>
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
    if (isSmallScreen()) {
      this.toggleSidebar(false)
    }
  }

  onInteraction = () => {
    if (!isSmallScreen()) {
      this.closeMessage()
    }
  }

  closeMessage = () => {
    this.setState(({initialized, messageOpen}) => {
      const newState = {}
      if (messageOpen) {
        newState.messageOpen = false
      }
      if (!initialized) {
        this.onPlayStarted()
        newState.initialized = true
      }
      return Object.keys(newState).length ? newState : null
    })
  }

  toggleMessage = () => {
    this.setState(({messageOpen}) => {
      if (!messageOpen) {
        // eslint-disable-next-line
        gtag('event', 'view_help', {
          'event_label': 'View help',
          'event_category': 'help',
        })
      }
      return {
        messageOpen: !messageOpen,
      }
    })
  }

  toggleSidebar = sidebarState => {
    clearTimeout(this.toggleTimer)
    this.setState(({sidebarOpen}) => {
      let newState = null
      if (sidebarState === undefined) {
        newState = !sidebarOpen
      } else if (sidebarOpen !== sidebarState) {
        newState = sidebarState
      }
      return newState !== null ? {
        sidebarOpen: newState,
        allowMenuChange: false
      } : null
    })
  }

  onCompositionSelected = ({value, id}) => {
    const selectedCompositionName = value || id
    this.setState(({currentCompositionName}) => {
      if (selectedCompositionName && selectedCompositionName !== currentCompositionName) {
        return {
          currentCompositionName: selectedCompositionName,
        }
      }
    })
  }

  onSmartLoopingSelected = () => {
    if (!this.state.smartLooping) {
      // eslint-disable-next-line
      gtag('event', 'enable_smart_looping', {
        'event_label': 'Enable Smart Looping',
        'event_category': 'set_option',
      })
    }
    this.setState({
      smartLooping: !this.state.smartLooping,
    })
  }

  onFadeSelected = () => {
    if (!this.state.vanishSquares) {
      // eslint-disable-next-line
      gtag('event', 'enable_fade', {
        'event_label': 'Enable Magic Vanishing Act',
        'event_category': 'set_option',
      })
    }
    this.setState({
      vanishSquares: !this.state.vanishSquares,
    })
  }

  onPoetrySelected = () => {
    if (!this.state.showPoetry) {
      // eslint-disable-next-line
      gtag('event', 'enable_poetry', {
        'event_label': 'Enable poetry',
        'event_category': 'set_option',
      })
    }
    this.setState({
      showPoetry: !this.state.showPoetry,
    })
  }

  onStopLooping = () => {
    // eslint-disable-next-line
    gtag('event', 'stop_all_looping', {
      'event_label': 'Stop all looping',
      'event_category': 'looping',
    })
    this.setState({
      stopLooping: true,
    })
  }

  resetStopLooping = () => {
    this.setState({
      stopLooping: false,
    })
  }

  onShowAllSquares = event => {
    this.setState({
      showAllSquares: true,
    })
  }

  resetShowAllSquares = () => {
    this.setState({
      showAllSquares: false,
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
    if (mode === 'application') {
      window.location.hash = compositionName
    }
    return compositionName
  }

  getSquareCount = (width, height) => {
    const rowSize = Math.floor(width / 80)
    const columnSize = Math.floor(height / 80)
    const newSquareCount = mode === 'application' ? rowSize * columnSize : 150
    if (newSquareCount !== this.state.squareCount) {
      this.setState({
        squareCount: newSquareCount,
      })
    }
  }

}

export default App
