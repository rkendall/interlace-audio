const { Howl } = require('howler')
const { resolve } = require('node:path')
require("@mohayonao/web-audio-api-shim")

// global.document = { addEventListener: () => { } }

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