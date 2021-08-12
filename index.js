const Plugin = require('./lib/Plugin.js')

// executed by electron's node.js
module.exports = {
  async saveToFile (data, lib) {
    await Plugin.syncAppFiles(data.folder)
    await Plugin.syncStaticFolders(data)
    Plugin.syncIndexHtml(data.folder)
    Plugin.syncJsCode(data, lib.jsdom.JSDOM)
  }
}
