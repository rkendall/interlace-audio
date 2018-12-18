import React, {Component} from 'react'
import Select from 'react-select'
import classNames from 'classnames';
import ChevronRight from '@material-ui/icons/ChevronRight'
import './Header.css'

export default class Header extends Component {
  constructor() {
    super()
    this.state = {
      isMenuOnTop: false,
    }
  }

  render() {

    const {openSidebar, isSidebarOpen, onSelect, selectedValue, compositionTitles} = this.props
    const {isMenuOnTop} = this.state
    const options = compositionTitles.map(({name, title}, ind) => (
      {
        value: name,
        label: `${ind + 1}. ${title}`
      })
    )

    const selectStyles = {
      menu: base => ({
        ...base,
        'z-index': '30',
      })
    }

    const value = options.find(option => option.value === selectedValue)
    return (
      <div className={classNames('headerContainer', {visible: !isSidebarOpen})}>
        <div className="toggleContainer">
          <div className={'toggle header'} onClick={openSidebar}><ChevronRight/></div>
        </div>
        <div className="title header">
          <div className="prompt">Select an Impromptu:</div>
          <Select
            className={classNames('select', {onTop: isMenuOnTop})}
            options={options}
            value={value}
            onChange={onSelect}
            styles={selectStyles}
          />
        </div>
      </div>
    )
  }

  putMenuOnTop = () => {
    // this.setState({
    //   isMenuOnTop: true,
    // })
  }

  putMenuUnderneath = () => {
    this.setState({
      isMenuOnTop: false,
    })
  }

}