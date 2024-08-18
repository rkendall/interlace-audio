var AudioContext = require('web-audio-api').AudioContext
  , context = new AudioContext
  , Speaker = require('speaker')
 
context.outStream = new Speaker({
  channels: context.format.numberOfChannels,
  bitDepth: context.format.bitDepth,
  sampleRate: context.sampleRate
})