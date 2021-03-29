const path = require('path')
const ExtendJS = require('../ExtendJS.js')

module.exports = {
  getClassDir (filePath, folder = '') {
    const dir = path.dirname(filePath.replace(folder, ''))
    return (dir === '/') ? '' : dir.replace(/[^a-z0-9/]/g, '')
  },

  getClassName (fileName) {
    return ExtendJS.capitalize(this.getClassPage(fileName))
  },

  getClassPage (fileName) {
    return path.basename(fileName, '.html').replace(/[^a-z0-9]/g, '')
  }
}
