import React, { Component } from 'react'
import './error.css'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <h1 className="error">Application error. Please refresh the page.</h1>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
