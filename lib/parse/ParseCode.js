const fs = require('fs')
const ExtendJS = require('../ExtendJS.js')
const File = require('../File.js')
const ParseCommon = require('./ParseCommon.js')
const ParseRender = require('./ParseRender.js')

module.exports = {
  getIndexHtml (html) {
    html = html.replace(/<base href="">[\s\S]*?<\/script>/g, '<base href="/">')
    html = html.replace(/<link[\s\S]*.css">/g,
      '<link rel="stylesheet" href="css/compiled/style.css">')
    html = html.replace(/<body[\s\S]*<\/body>/g, '<body>\n  <div id="root"></div>\n</body>')
    return html
  },

  getAppJs (js, folder, htmlFiles) {
    const imports = this.getFiles(folder, htmlFiles, 'page', 'getClassImport').join('')
    js = this.injectJs(js, imports, 'import')
    const routes = this.getFiles(folder, htmlFiles, 'page', 'getRoutePath')
      .sort().reverse().join('')
    js = this.injectJsx(js, routes, 'router', 8)
    return js
  },

  injectJs (js, snippet, location, spaces = 0) {
    const regex = new RegExp(`(\\/\\/ desech - start ${location} block\r?\n)` +
      `([\\s\\S]*?)([ ]{${spaces}}\\/\\/ desech - end ${location} block)`, 'g')
    return js.replace(regex, `$1${snippet}$3`)
  },

  injectJsx (js, snippet, location, spaces = 0) {
    const regex = new RegExp(`({\\/\\* desech - start ${location} block \\*\\/}\r?\n)` +
      `([\\s\\S]*?)([ ]{${spaces}}{\\/\\* desech - end ${location} block ` +
      '\\*\\/})', 'g')
    return js.replace(regex, `$1${snippet}$3`)
  },

  getFiles (folder, files, fileType, callback) {
    const list = []
    for (const file of files) {
      if (!fileType || (fileType === 'page' && !file.isComponent) ||
        (fileType === 'component' && file.isComponent)) {
        list.push(this[callback](folder, file))
      }
    }
    return ExtendJS.unique(list)
  },

  getClassImport (folder, file) {
    const clsName = ParseCommon.getClassName(file.path, folder)
    const clsPath = ParseCommon.getClassPath(file.path, folder)
    return `import ${clsName} from './${clsPath}'\n`
  },

  getRoutePath (folder, file) {
    let route = file.path.replace(folder, '')
    if (route.includes('/index')) route = File.dirname(route)
    const cls = ParseCommon.getClassName(file.path, folder)
    return `        <Route path="${route}" element={<${cls} />} />\n`
  },

  getClassJsFile (folder, filePath) {
    const clsPath = ParseCommon.getClassPath(filePath, folder)
    return File.resolve(folder, `_export/src/${clsPath}`)
  },

  parseClassJsCode (js, file, relBase, data, lib) {
    const body = this.getClassBody(file.path)
    const rendered = ParseRender.getRenderBlock(body, file, data, lib)
    js = this.injectJs(js, rendered.html, 'render', 4)
    const overrideImports = []
    const component = this.getComponentData(body, rendered.component, overrideImports)
    js = this.injectJs(js, component, 'data', 4)
    const importCode = this.getCodeImport(body, rendered.html, relBase, data, overrideImports)
    js = this.injectJs(js, importCode, 'import')
    return js
  },

  getClassBody (filePath) {
    const body = fs.readFileSync(filePath).toString()
    // components don't have <body>
    if (body.indexOf('<body>') === -1) return body
    const match = /<body>([\s\S]*)<\/body>/g.exec(body)
    return (match && match[1]) ? match[1].trim() : ''
  },

  getComponentData (body, data, overrideImports) {
    this.replaceComponentInstances(data, overrideImports)
    const component = JSON.stringify(data, null, 2).replace(/(\r\n|\n|\r)/gm, '\n    ')
      .replace(/"__INST__(.*?)__INST__"/g, '$1')
    return '    const data = ' + component + '\n'
  },

  // we have component classes set by ParentOverride.injectComponent() in the `defaults` object
  // and we also have component files coming from Desech Studio in `overrides` and `variants`
  // we have to convert all this to react classes and then wrap them with "__INST__"
  // to mark them and then replace them later with regex
  replaceComponentInstances (data, overrideImports) {
    if (!data) return
    for (const [name, value] of Object.entries(data)) {
      if (name === 'component') {
        this.addInstance(data, value, overrideImports)
      } else if (typeof value === 'object') {
        this.replaceComponentInstances(value, overrideImports)
      }
    }
  },

  addInstance (data, value, overrideImports) {
    let cls = value
    if (value.startsWith('component/')) {
      cls = ParseCommon.getClassName(value)
      // we only need to import the components found in overrides
      // the ones in the `default` object are already imported
      overrideImports.push(value)
    }
    data.component = '__INST__' + cls + '__INST__'
  },

  getCodeImport (body, rendered, relBase, data, overrideImports) {
    const list = []
    this.addLibImports(list, rendered, relBase)
    this.addClassComponentImports(list, body, relBase, data, overrideImports)
    this.addInstanceOverridesImport(list, relBase, data.folder, overrideImports)
    return ExtendJS.unique(list).join('\n') + '\n'
  },

  addLibImports (list, rendered, relBase) {
    if (rendered.indexOf('</Link>') >= 0) {
      list.push("import { Link } from 'react-router-dom'")
    }
    list.push(`import DS from '${File.relative(relBase, '/lib/DS.js')}'`)
  },

  addClassComponentImports (list, body, relBase, data) {
    const matches = body.matchAll(/data-ss-component="(.*?)"/g)
    for (const match of matches) {
      const json = JSON.parse(match[1].replaceAll('&quot;', '"'))
      // we skip the master component data; we only want the instances
      if (!json.file) continue
      const line = this.getClassComponentImport(json.file, relBase, data.folder)
      list.push(line)
    }
  },

  getClassComponentImport (cmpFile, relBase, folder) {
    const clsPath = ParseCommon.getClassPath(cmpFile, folder)
    const clsPathRel = File.relative(relBase, '/' + clsPath)
    const dottedPath = clsPathRel.startsWith('.') ? clsPathRel : './' + clsPathRel
    const clsName = ParseCommon.getClassName(cmpFile, folder)
    return `import ${clsName} from '${dottedPath}'`
  },

  addInstanceOverridesImport (list, relBase, folder, overrideImports) {
    if (!overrideImports.length) return
    for (const file of overrideImports) {
      const line = this.getClassComponentImport(file, relBase, folder)
      list.push(line)
    }
  }
}
