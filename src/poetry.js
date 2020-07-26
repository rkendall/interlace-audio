import {shuffleArray} from './utilities'

let selectors = {}
const lines = {}
let active = false

const getSelector = name => {
  const baseName = name.replace(/\d+$/, '')
  return selectors[baseName] || 'default'
}

const checkArrays = () => {
  if (process.env.NODE_ENV === 'production') {
    return
  }
  let count = null
  Object.entries(lines).forEach(([name, text]) => {
    if (name === 'fast') {
      return
    }
    const newCount = text.source.length
    if (count) {
      if (count !== newCount) {
        throw new Error(`Poetry section ${name} does not have correct number of words. Expecting ${count}.`)
      }
    } else {
      count = newCount
    }
  })
}

const poetry = {
  init: poem => {
    if (!poem) {
      active = false
      return false
    }
    active = true
    const {text, aliases = []} = poem

    selectors = aliases.reduce((accumulator, [groups, label]) => {
      groups.forEach(group => {
        accumulator[group] = label
      })
      return accumulator
    }, {})

    Object.entries(text).forEach(([name, section]) => {
      lines[name] = {source: section.split(' '), words: []}})
    checkArrays()
    return true
  },
  get: ({group, fast = false}) => {
    if (!active) {
      return ''
    }
    if (fast) {
      const text = lines.fast
      if (!text.words.length) {
        text.words = shuffleArray([...text.source])
      }
      return text.words.shift().replace(/=/g, ' ')
    }
    let phrase = ''
    Object.entries(lines).forEach(([name, text]) => {
      if (name === 'fast') {
        return
      }
      if (!text.words.length) {
        text.words = [...text.source]
      }
      const nextPhrase = text.words.shift()
      if (name === getSelector(group)) {
        phrase = nextPhrase.replace(/=/g, ' ')
      }
    })
    return phrase
  }
}

export default {
  init: poem => poetry.init(poem),
  get: group => poetry.get(group),
}