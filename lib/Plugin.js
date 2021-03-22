const path = require('path')
const File = require('./File.js')
const Template = require('./Template.js')
const Code = require('./Code.js')

module.exports = {
  async syncAppFiles (folder) {
    const source = path.resolve(__dirname, '../dist/my-app')
    const dest = path.resolve(folder, '_export')
    await this.syncFiles(source, dest)
  },

  async syncFiles (source, dest) {
    File.createMissingDir(dest)
    const fileTree = File.readFolder(source)
    await File.syncFolder(fileTree, source, dest)
  },

  async syncPublicFolder (data) {
    const publicDir = path.resolve(data.folder, '_export/public')
    this.syncCssFile(publicDir, data.compiledCss)
    await File.syncFolder(data.rootMiscFiles, data.folder, publicDir)
  },

  syncCssFile (publicDir, css) {
    const file = path.resolve(publicDir, 'css/compiled/style.css')
    File.writeToFile(file, css)
  },

  syncIndexHtml (folder) {
    const html = Template.getProjectFile(folder, 'index.html')
    const file = path.resolve(folder, '_export/public/index.html')
    File.writeToFile(file, Code.getIndexHtml(html))
  },

  syncJsCode (folder, htmlFiles) {
    this.syncAppJs(folder, htmlFiles)
    this.syncJsComponents(folder, htmlFiles)
    this.syncJsPages(folder, htmlFiles)
  },

  syncAppJs (folder, htmlFiles) {
    const file = path.resolve(folder, '_export/src/App.js')
    const js = Template.getTemplate('App.js')
    File.writeToFile(file, Code.getAppJs(js, folder, htmlFiles))
  },

  syncJsComponents (folder, htmlFiles) {
    for (const file of htmlFiles) {
      if (file.isComponent) this.syncJsClass(folder, file, 'component')
    }
  },

  syncJsPages (folder, htmlFiles) {
    for (const file of htmlFiles) {
      if (!file.isComponent) this.syncJsClass(folder, file, 'page')
    }
  },

  syncJsClass (folder, file, type) {
    const filePath = (type === 'component') ? file.path.replace('/component', '') : file.path
    const destFile = Code.getJsFile(folder, filePath, type)
    const js = Template.getTemplate('Class.js')
    const relBase = path.dirname(destFile.replace(path.resolve(folder, '_export/src'), ''))
    File.writeToFile(destFile, Code.getJsCode(js, file, relBase))
  }
}
