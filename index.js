const Plugin = require('./lib/Plugin.js')

// executed by electron's node.js
module.exports = {
  saveToFile (data) {
    Plugin.syncAppFiles(data.folder)
    Plugin.syncPublicFolder(data.folder)
    Plugin.syncIndexHtml(data.folder)
    Plugin.syncJsCode(data.folder)
  }
}
