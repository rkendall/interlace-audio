require = require('esm-wallaby')(module)
const open = require('open')

try {
    open('http://localhost:3000')
} catch (error) {
    console.error(error)
}