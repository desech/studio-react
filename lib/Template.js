const path = require('path')
const fs = require('fs')

module.exports = {
  getProjectFile (folder, file) {
    const destFile = path.resolve(folder, file)
    return fs.readFileSync(destFile).toString()
  },

  getTemplate (template) {
    const file = path.resolve(__dirname, 'template', template)
    return fs.readFileSync(file).toString()
  }
}
