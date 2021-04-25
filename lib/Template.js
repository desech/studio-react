const fs = require('fs')

module.exports = {
  getProjectFile (folder, file) {
    const destFile = folder + '/' + file
    return fs.readFileSync(destFile).toString()
  },

  getTemplate (template) {
    const file = __dirname + '/template/' + template // eslint-disable-line
    return fs.readFileSync(file).toString()
  }
}
