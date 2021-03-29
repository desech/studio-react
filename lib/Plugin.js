const fs = require('fs')
const path = require('path')
const File = require('./File.js')
const Template = require('./Template.js')
const ParseCommon = require('./parse/ParseCommon.js')
const ParseCode = require('./parse/ParseCode.js')

module.exports = {
  async syncAppFiles (folder) {
    const source = path.resolve(__dirname, '../dist/my-app')
    const dest = path.resolve(folder, '_export')
    File.createMissingDir(dest)
    const fileTree = File.readFolder(source)
    // we don't want to overwrite the react framework files
    await File.syncFolder(fileTree, source, dest, false)
  },

  async syncPublicFolder (data) {
    const publicDir = path.resolve(data.folder, '_export/public')
    const file = path.resolve(publicDir, 'css/compiled/style.css')
    File.writeToFile(file, data.compiledCss)
    // we do want to overwrite all the public files
    await File.syncFolder(data.rootMiscFiles, data.folder, publicDir)
  },

  syncIndexHtml (folder) {
    const html = Template.getProjectFile(folder, 'index.html')
    const file = path.resolve(folder, '_export/public/index.html')
    File.writeToFile(file, ParseCode.getIndexHtml(html))
  },

  syncJsCode (folder, htmlFiles, JSDOM) {
    this.syncAppJs(folder, htmlFiles)
    this.syncJsComponents(folder, htmlFiles, JSDOM)
    this.syncJsPages(folder, htmlFiles, JSDOM)
  },

  syncAppJs (folder, htmlFiles) {
    const file = path.resolve(folder, '_export/src/App.js')
    const js = fs.existsSync(file) ? File.readFile(file) : Template.getTemplate('App.js')
    File.writeToFile(file, ParseCode.getAppJs(js, folder, htmlFiles))
  },

  syncJsComponents (folder, htmlFiles, JSDOM) {
    for (const file of htmlFiles) {
      if (file.isComponent) this.syncJsClass(folder, file, 'component', JSDOM)
    }
  },

  syncJsPages (folder, htmlFiles, JSDOM) {
    for (const file of htmlFiles) {
      if (!file.isComponent) this.syncJsClass(folder, file, 'page', JSDOM)
    }
  },

  syncJsClass (folder, file, type, JSDOM) {
    const filePath = (type === 'component') ? file.path.replace('/component', '') : file.path
    const destFile = ParseCode.getClassJsFile(folder, filePath, type)
    const js = this.getClassJSCode(destFile, file.name)
    const relBase = path.dirname(destFile.replace(path.resolve(folder, '_export/src'), ''))
    const code = ParseCode.getClassJsCode(js, file, relBase, JSDOM)
    File.writeToFile(destFile, code)
  },

  getClassJSCode (file, name) {
    if (fs.existsSync(file)) return File.readFile(file)
    const js = Template.getTemplate('Class.js')
    return js.replace('CLASSNAME', ParseCommon.getClassName(name))
  }
}
