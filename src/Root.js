import React, {Component} from 'react'
import {Provider as AlertProvider} from 'react-alert'
import AlertTemplate from 'react-alert-template-basic'
import App from './App.js'

const options = {
  position: 'bottom center',
  timeout: 5000,
  offset: '30px',
  transition: 'scale'
}

export default () => (
  <AlertProvider template={AlertTemplate} {...options} >
    <App />
  </AlertProvider>
)