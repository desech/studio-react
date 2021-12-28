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
    const componentData = this.getAllComponentData(data)
    this.syncJsComponents(data, componentData, lib)
    this.syncJsPages(data, lib)
  },

  syncAppJs (folder, htmlFiles) {
    const file = File.resolve(folder, '_export/src/App.js')
    const js = fs.existsSync(file) ? File.readFile(file) : Template.getTemplate('App.js')
    File.writeToFile(file, ParseCode.getAppJs(js, folder, htmlFiles))
  },

  // we need all this component data for creating the overrides
  getAllComponentData (data) {
    const obj = {}
    for (const file of data.htmlFiles) {
      const html = File.readFile(file.path)
      this.extractComponentData(html, file.path, obj)
    }
    return obj
  },

  extractComponentData (html, file, obj) {
    html.matchAll(/data-ss-component="(.*?)"/g, (match, data) => {
      const json = JSON.parse(data.replaceAll('&quot;', '"'))
      // if (json.file)
      // obj[json.file]
    })
  },

  syncJsComponents (data, componentData, lib) {
    for (const file of data.htmlFiles) {
      if (file.isComponent) {
        this.syncJsModule(data, file, 'component', lib, componentData[file.path])
      }
    }
  },

  syncJsPages (data, lib) {
    for (const file of data.htmlFiles) {
      if (!file.isComponent) {
        this.syncJsModule(data, file, 'page', lib)
      }
    }
  },

  syncJsModule (data, file, fileType, lib, cmpData = null) {
    const clsName = ParseCommon.getClassName(file.path, data.folder)
    const destFile = ParseCode.getClassJsFile(data.folder, file.path)
    const relBase = File.dirname(destFile.replace(File.resolve(data.folder, '_export/src'), ''))
    let js = this.getClassJSCode(destFile, clsName)
    js = ParseCode.parseClassJsCode(js, file, data.folder, relBase, fileType, data.compiledCss,
      lib, cmpData)
    File.writeToFile(destFile, js)
  },

  getClassJSCode (file, clsName) {
    if (fs.existsSync(file)) return File.readFile(file)
    const js = Template.getTemplate('Class.js')
    return js.replace('CLASSNAME', clsName)
  }
}
