import {shuffleArray} from './utilities'

const state = {
  aliasSelector: {},
  lines: {},
  styles: {},
  important: [],
  first: [],
  alias: null,
  active: false,
  requiredNextPhrase: '',
}

const getAlias = name => {
  const {aliasSelector} = state
  return aliasSelector[name] || aliasSelector[name.replace(/\d+$/, '')] || 'default'
}
const refresh = text => {
  if (!text.words.length) {
    text.words = shuffleArray([...text.source])
  }
}
const formatPhrase = words => words.shift().replace(/=/g, ' ')
const getPhraseFromAlias = alias => {
  const {lines, first} = state
  const text = lines[alias]
  if (alias === 'first') {
    return formatPhrase(first)
  }
  refresh(text)
  return formatPhrase(text.words)
}

const getPhrase = ({group, fast}) => {
  const {important, first, requiredNextPhrase} = state
  if (first.length) {
    state.alias = 'first'
    return getPhraseFromAlias('first')
  }
  const selectedAlias = getAlias(group)
  if (important.includes(selectedAlias)) {
    state.requiredNextPhrase = ''
    state.alias = selectedAlias
    return getPhraseFromAlias(selectedAlias)
  }
  if (requiredNextPhrase) {
    const phrase = requiredNextPhrase
    state.requiredNextPhrase = ''
    return phrase
  }
  state.alias = fast ? 'fast' : selectedAlias
  return getPhraseFromAlias(state.alias)
}

const poetry = {
  init: poem => {
    if (!poem) {
      state.active = false
      return false
    }
    const {text, aliases = [], styles = {}, important = []} = poem
    state.active = true
    state.requiredNextPhrase = ''
    state.first = []
    state.styles = styles
    state.important = important

    state.aliasSelector = aliases.reduce((accumulator, [groups, label]) => {
      groups.forEach(group => {
        accumulator[group] = label
      })
      return accumulator
    }, {})

    Object.entries(text).forEach(([name, section]) => {
      state.lines[name] = {
        source: section.trim().split(' '),
        words: [],
      }
      if (name === 'first') {
        state.first = section.trim().split(' ')
      }
    })
    return true
  },
  get: ({group, fast = false}) => {
    const {active, styles} = state
    if (!active) {
      return ''
    }
    let phrase = getPhrase({group, fast})
    const connectorPosition = phrase.indexOf('+')
    if (connectorPosition !== -1) {
      state.requiredNextPhrase = phrase.substring(connectorPosition + 1, phrase.length)
      phrase = phrase.substring(0, connectorPosition)
    }
    return {phrase, style: styles[state.alias] || null}
  }
}

export default {
  init: poem => poetry.init(poem),
  get: group => poetry.get(group),
}