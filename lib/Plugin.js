const path = require('path')
const File = require('./File.js')
const Template = require('./Template.js')
const Code = require('./Code.js')

module.exports = {
  syncAppFiles (folder) {
    const source = path.resolve(__dirname, '../dist/my-app')
    const dest = folder + '/_export'
    this.syncFiles(source, dest)
  },

  syncPublicFolder (folder) {
    const public = folder + '/_export/public'
    File.createMissingDir(public)
    this.copyPublicFolderFiles(folder, public)
  },

  copyPublicFolderFiles (folder, public) {
    for (const dir of ['asset', 'css', 'font', 'js']) {
      const source = path.resolve(folder, dir)
      this.syncFiles(source, public + '/' + dir)
    }
  },

  syncFiles (source, dest) {
    File.createMissingDir(dest)
    const fileTree = File.readFolder(source)
    File.syncFolder(fileTree, source, dest)
  },

  syncIndexHtml (folder) {
    const file = folder + '/_export/public/index.html'
    const html = Template.getProjectFile(folder, 'index.html')
    File.writeToFile(file, Code.getIndexHtml(html))
  },

  syncJsCode (folder) {
    const htmlFiles = this.getHtmlFiles(folder)
    this.syncAppJs(folder, htmlFiles)
    this.syncJsComponents(folder, htmlFiles)
    this.syncJsPages(folder, htmlFiles)
  },

  getHtmlFiles (folder) {
    const files = File.readFolder(folder)
    const list = []
    this.addHtmlFolderFiles(files, list, folder)
    return list
  },

  addHtmlFolderFiles (files, list, folder) {
    for (const file of files) {
      if (file.type === 'folder' && file.name === '_export') continue
      if (file.type === 'folder') this.addHtmlFolderFiles(file.children, list, folder)
      if (file.extension !== 'html') continue
      if (Code.getClassDir(file.path, folder).indexOf('/component') === 0) {
        file.isComponent = true
      }
      list.push(file)
    }
  },

  syncAppJs (folder, htmlFiles) {
    const file = folder + '/_export/src/App.js'
    let js = Template.getTemplate('App.js')
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

  syncJsClass(folder, file, type) {
    const filePath = (type === 'component') ? file.path.replace('/component', '') : file.path
    const destFile = Code.getJsFile(folder, filePath, type)
    let js = Template.getTemplate('Class.js')
    const relBase = path.dirname(destFile.replace(folder + '/_export/src', ''))
    File.writeToFile(destFile, Code.getJsCode(js, file, relBase)) 
  }
}
