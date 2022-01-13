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
    this.syncLibs(data.folder, lib)
    ParseCommon.replaceAllAttributes(data.component.overrides)
    this.syncJsComponents(data, lib)
    this.syncJsPages(data, lib)
  },

  syncAppJs (folder, htmlFiles) {
    const file = File.resolve(folder, '_export/src/App.js')
    const js = fs.existsSync(file) ? File.readFile(file) : Template.getTemplate('App.js')
    File.writeToFile(file, ParseCode.getAppJs(js, folder, htmlFiles))
  },

  syncLibs (folder, lib) {
    for (const file of ['DS', 'ExtendJS']) {
      const src = File.resolve(__dirname, 'template', file + '.js')
      const dest = File.resolve(folder, `_export/src/lib/${file}.js`)
      lib.fse.copySync(src, dest)
    }
  },

  syncJsComponents (data, lib) {
    for (const file of data.htmlFiles) {
      if (file.isComponent) {
        this.syncJsModule(data, file, lib)
        this.syncComponentStory(data, file)
      }
    }
  },

  syncJsPages (data, lib) {
    for (const file of data.htmlFiles) {
      if (!file.isComponent) {
        this.syncJsModule(data, file, lib)
      }
    }
  },

  syncJsModule (data, file, lib) {
    const clsName = ParseCommon.getClassName(file.path, data.folder)
    const destFile = ParseCode.getClassJsFile(data.folder, file.path)
    const relBase = File.dirname(destFile.replace(File.resolve(data.folder, '_export/src'), ''))
    let js = this.getClassJSCode(destFile, clsName, file.isComponent)
    js = ParseCode.parseClassJsCode(js, file, relBase, data, lib)
    File.writeToFile(destFile, js)
  },

  getClassJSCode (file, clsName, isComponent) {
    if (fs.existsSync(file)) return File.readFile(file)
    const templateFile = isComponent ? 'ClassComponent.js' : 'ClassPage.js'
    const js = Template.getTemplate(templateFile)
    return js.replaceAll('CLASSNAME', clsName)
  },

  syncComponentStory (data, file) {
    const clsName = ParseCommon.getClassName(file.path, data.folder)
    const clsPath = ParseCommon.getClassPath(file.path, data.folder)
    const storyFile = File.resolve(data.folder, `_export/src/stories/${clsName}.stories.js`)
    const js = Template.getTemplate('Component.stories.js')
      .replaceAll('CLASSNAME', clsName).replaceAll('FILEPATH', clsPath)
    if (!fs.existsSync(storyFile)) File.writeToFile(storyFile, js)
  }
}
