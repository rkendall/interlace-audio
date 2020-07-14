let selectors = {}
const lines = {}
let active = false

const getSelector = name => {
  const baseName = name.replace(/\d+$/, '')
  return selectors[baseName]
}

const poetry = {
  init: poem => {
    if (!poem) {
      active = false
      return false
    }
    active = true
    const {text, aliases} = poem
    selectors = aliases.reduce((accumulator, [groups, label]) => {
      groups.forEach(group => {
        accumulator[group] = label
      })
      return accumulator
    }, {})

    Object.entries(text).forEach(([name, section]) => {
      lines[name] = {source: section.split(' '), words: []}})
    return true
  },
  get: ({group, fast = false}) => {
    if (!active) {
      return ''
    }
    const text = fast ? lines.fast : lines[getSelector(group)] || lines.default
    if (!text.words.length) {
      text.words = [...text.source]
    }
    return text.words.shift().replace(/=/g, ' ')
  }
}

export default {
  init: poem => poetry.init(poem),
  get: group => poetry.get(group),
}