const fs = require('fs-extra')
const path = require('path')
const { orderBy } = require('natural-orderby')

const filepath = process.argv[2]

const makeGroup = (config, groupName) => {
  const group = {
    instruments: {
      high: [],
      medium: [],
      low: []
    },
  }
  const maxActive = config.groupLimits && config.groupLimits[groupName]
  const length = config.lengths && config.lengths[groupName]
  if (maxActive) {
    group.maxActive = maxActive
  }
  if (length) {
    group.length = length
  }
  return group
}

fs.readFile(path.join('src/compositionConfigs/', filepath), 'utf8')
  .then(content => {
    const config = JSON.parse(content)
    config.groups = {}
    config.audioItems.forEach(item => {
        const instrument = item[0]
        const groupName = item[1]
        let group = config.groups[groupName]
        if (!group) {
          group = config.groups[groupName] = makeGroup(config, groupName)
        }
        if (!group.instruments.high.includes(instrument)) {
          group.instruments.high.push(instrument)
        }
      }
    )
    Object.entries(config.groups).forEach(([name, group]) => {
      config.groups[name].instruments.high = orderBy(group.instruments.high)
    })
    const output = JSON.stringify(config, null, 2)
    console.log(JSON.stringify(config, null, 2))
    fs.writeFile(path.join('scripts/output/', filepath), output, 'utf8')
  })
  .catch(error => console.error(error))
  .catch(error => {
    console.error(error)
  })