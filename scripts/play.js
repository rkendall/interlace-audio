const { Howl, Howler } = require('howler')
const { resolve } = require('node:path')
// const  { AudioContext: context } = require('node-web-audio-api')
// global.AudioContext = context
// global.AudioContext = require('web-audio-api').AudioContext
const Speaker = require('speaker')
require("@mohayonao/web-audio-api-shim")
// const Context = require('web-audio-api').AudioContext
// console.debug('Context', Context.toString())
// class ContextClass extends Context {
//   constructor(...args) {
//     super(...args)
//     console.debug('Constructor called')
//     console.debug('this.outStream', this.outStream)
//   }
//   outStream = new Speaker({
//     channels: this.format.numberOfChannels,
//     bitDepth: this.format.bitDepth,
//     sampleRate: this.sampleRate
//   })
// }
// console.debug('ContextClass', ContextClass.toString())
// global.AudioContext = ContextClass
global.document = { addEventListener: () => { } }
// Howler.cxt = new ContextClass()

const filepath = resolve(process.cwd(), 'scripts/test.mp3')
const sound = new Howl({
  ctx: true,
  autoUnlock: false,
  src: [filepath],
  onend: () => {
    console.log('Finished!')
  },
  onloaderror: (...error) => {
    console.error(...error)
  }
})

sound.play()