const fs = require('fs')
const File = require('./File.js')
const Template = require('./Template.js')
const ParseCommon = require('./parse/ParseCommon.js')
const ParseCode = require('./parse/ParseCode.js')

module.exports = {
  async syncAppFiles (folder) {
    const source = File.normalize(__dirname, '../dist/my-app')
    const dest = File.resolve(folder, '_export')
    File.createMissingDir(dest)
    const fileTree = File.readFolder(source)
    // we don't want to overwrite the boilerplate files
    await File.syncFolder(fileTree, source, dest, false)
  },

  async syncStaticFolders (data) {
    const dir = File.resolve(data.folder, '_export/public')
    const file = File.resolve(dir, 'css/compiled/style.css')
    File.writeToFile(file, data.compiledCss)
    // we do want to overwrite all the static files
    await File.syncFolder(data.rootMiscFiles, data.folder, dir)
  },

  syncIndexHtml (folder) {
    const html = Template.getProjectFile(folder, 'index.html')
    const file = File.resolve(folder, '_export/public/index.html')
    File.writeToFile(file, ParseCode.getIndexHtml(html))
  },

  syncJsCode (folder, htmlFiles, JSDOM) {
    this.syncAppJs(folder, htmlFiles)
    this.syncJsComponents(folder, htmlFiles, JSDOM)
    this.syncJsPages(folder, htmlFiles, JSDOM)
  },

  syncAppJs (folder, htmlFiles) {
    const file = File.resolve(folder, '_export/src/App.js')
    const js = fs.existsSync(file) ? File.readFile(file) : Template.getTemplate('App.js')
    File.writeToFile(file, ParseCode.getAppJs(js, folder, htmlFiles))
  },

  syncJsComponents (folder, htmlFiles, JSDOM) {
    for (const file of htmlFiles) {
      if (file.isComponent) this.syncJsModule(folder, file, 'component', JSDOM)
    }
  },

  syncJsPages (folder, htmlFiles, JSDOM) {
    for (const file of htmlFiles) {
      if (!file.isComponent) this.syncJsModule(folder, file, 'page', JSDOM)
    }
  },

  syncJsModule (folder, file, type, JSDOM) {
    const destFile = ParseCode.getClassJsFile(folder, file.path, type)
    const relBase = destFile.replace(File.resolve(folder, '_export/src'), '')
    let js = this.getClassJSCode(destFile, file.name)
    js = ParseCode.parseClassJsCode(js, file, relBase, JSDOM)
    File.writeToFile(destFile, js)
  },

  getClassJSCode (file, name) {
    if (fs.existsSync(file)) return File.readFile(file)
    const js = Template.getTemplate('Class.js')
    return js.replace('CLASSNAME', ParseCommon.getClassName(name))
  }
}
