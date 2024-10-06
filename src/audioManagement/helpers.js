import { shuffleArray } from '../utilities'
import mode from '../mode'

const isInstallation = mode === 'installation'

const flattenAudioItems = (audioItemsByRange) =>
  Object.values(audioItemsByRange).reduce(
    (flattenedItems, items) => [...flattenedItems, ...items],
    [],
  )
const getCumulativeLength = (audioItemsByRange) =>
  Object.values(audioItemsByRange).reduce(
    (count, values) => count + values.length,
    0,
  )

const getItemsForApplication = (squareCount) => {
  const originalItems = this.audioItemsByRange
  const audioItems = { high: [], medium: [], low: [] }
  let indexes = { high: 0, medium: 0, low: 0 }
  while (getCumulativeLength(audioItems) < squareCount) {
    Object.entries(originalItems).forEach(([range, items]) => {
      if (!items.length) {
        return
      }
      const ind = indexes[range]
      indexes[range] = ind < items.length - 1 ? ind + 1 : 0
      const audioItem = items[indexes[range]]
      audioItems[range].push(audioItem)
    })
  }
  Object.entries(audioItems).forEach(([range, arr]) => {
    audioItems[range] = shuffleArray(arr)
  })
  const duplicatedAudioItems = flattenAudioItems(audioItems)
  return {
    audioItems: duplicatedAudioItems.slice(0, squareCount),
    audioCategories: {},
  }
}

const getItemsForInstallation = ({ squareCount, audioItemsByRange }) => {
  const audioCategories = { high: [], medium: [], low: [] }
  const audioItems = []
  let offset = 0
  Object.keys(audioCategories).forEach((range) => {
    const items = audioItemsByRange[range]
    audioItems.push(...items)
    audioCategories[range] = Array.from(items, (item, ind) => offset + ind)
    offset += items.length
  }, [])
  return { audioItems, audioCategories }
}

const getSizedAudioItemsArray = ({ squareCount, audioItemsByRange }) => {
  const getSizedAudioItems = isInstallation
    ? getItemsForInstallation
    : getItemsForApplication
  const audioItems = getSizedAudioItems({ squareCount, audioItemsByRange })
  return audioItems
}

export { getSizedAudioItemsArray }
