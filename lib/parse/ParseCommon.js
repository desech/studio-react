const ExtendJS = require('../ExtendJS.js')
const File = require('../File.js')

module.exports = {
  getClassDir (filePath, folder = '') {
    const dir = File.dirname(filePath.replace(folder, ''))
    return (dir === '/') ? '' : dir.replace(/[^a-z0-9-/]/gi, '')
  },

  getClassName (fileName) {
    const name = this.getClassFile(fileName)
    return ExtendJS.capitalize(ExtendJS.toCamelCase(name))
  },

  getClassFile (fileName) {
    return File.basename(fileName, '.html').replace(/[^a-z0-9-]/gi, '')
  }
}
