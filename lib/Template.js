const fs = require('fs')
const File = require('./File.js')

module.exports = {
  getProjectFile (folder, file) {
    const destFile = File.resolve(folder, file)
    return fs.readFileSync(destFile).toString()
  },

  getTemplate (template) {
    const file = File.resolve(__dirname, 'template', template)
    return fs.readFileSync(file).toString()
  }
}
