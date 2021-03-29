const path = require('path')
const ExtendJS = require('../ExtendJS.js')

module.exports = {
  getClassDir (filePath, folder = '') {
    const dir = path.dirname(filePath.replace(folder, ''))
    return (dir === '/') ? '' : dir.replace(/[^a-z0-9-/]/gi, '')
  },

  getClassName (fileName) {
    const name = this.getClassFile(fileName)
    return ExtendJS.capitalize(ExtendJS.toCamelCase(name))
  },

  getClassFile (fileName) {
    return path.basename(fileName, '.html').replace(/[^a-z0-9-]/gi, '')
  }
}
