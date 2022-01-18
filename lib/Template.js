const File = require('./File.js')

module.exports = {
  getProjectFile (folder, file) {
    const destFile = File.resolve(folder, file)
    return File.readFile(destFile)
  },

  getTemplate (template) {
    const file = File.resolve(__dirname, 'template', template)
    return File.readFile(file)
  }
}
