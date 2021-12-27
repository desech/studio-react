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
    const content = ParseCode.getIndexHtml(html)
    File.writeToFile(file, content)
  },

  syncJsCode (data, lib) {
    this.syncAppJs(data.folder, data.htmlFiles)
    this.syncJsComponents(data, lib)
    this.syncJsPages(data, lib)
  },

  syncAppJs (folder, htmlFiles) {
    const file = File.resolve(folder, '_export/src/App.js')
    const js = fs.existsSync(file) ? File.readFile(file) : Template.getTemplate('App.js')
    File.writeToFile(file, ParseCode.getAppJs(js, folder, htmlFiles))
  },

  syncJsComponents (data, lib) {
    for (const file of data.htmlFiles) {
      if (file.isComponent) this.syncJsModule(data, file, 'component', lib)
    }
  },

  syncJsPages (data, lib) {
    for (const file of data.htmlFiles) {
      if (!file.isComponent) this.syncJsModule(data, file, 'page', lib)
    }
  },

  syncJsModule (data, file, fileType, lib) {
    const destFile = ParseCode.getClassJsFile(data.folder, file.path, fileType)
    const relBase = File.dirname(destFile.replace(File.resolve(data.folder, '_export/src'), ''))
    let js = this.getClassJSCode(destFile, file.name)
    js = ParseCode.parseClassJsCode(js, file, relBase, fileType, data.compiledCss, lib)
    File.writeToFile(destFile, js)
  },

  getClassJSCode (file, name) {
    if (fs.existsSync(file)) return File.readFile(file)
    const js = Template.getTemplate('Class.js')
    return js.replace('CLASSNAME', ParseCommon.getClassName(name))
  }
}
