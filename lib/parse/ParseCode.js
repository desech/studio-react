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
    const regex = new RegExp(`(\\/\\/ desech studio - start ${location} block\r?\n)` +
      `([\\s\\S]*?)([ ]{${spaces}}\\/\\/ desech studio - end ${location} block)`, 'g')
    return js.replace(regex, `$1${snippet}$3`)
  },

  injectJsx (js, snippet, location, spaces = 0) {
    const regex = new RegExp(`({\\/\\* desech studio - start ${location} block \\*\\/}\r?\n)` +
      `([\\s\\S]*?)([ ]{${spaces}}{\\/\\* desech studio - end ${location} block ` +
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

  parseClassJsCode (js, file, folder, relBase, fileType, css, lib, componentData) {
    const body = this.getClassBody(file.path)
    const rendered = ParseRender.getRenderBlock(body, css, fileType, folder, lib, componentData)
    js = this.injectJs(js, rendered, 'render', 4)
    const importCode = this.getCodeImport(body, rendered, relBase, folder)
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

  getCodeImport (body, rendered, relBase, folder) {
    const list = []
    if (rendered.indexOf('</Link>') >= 0) {
      list.push("import { Link } from 'react-router-dom'\n")
    }
    this.setClassComponentImports(list, body, relBase, folder)
    return ExtendJS.unique(list).join('')
  },

  setClassComponentImports (list, body, relBase, folder) {
    const matches = body.matchAll(/data-ss-component="(.*?)"/g)
    for (const match of matches) {
      const json = JSON.parse(match[1].replaceAll('&quot;', '"'))
      // we skip the master component data; we only want the instances
      if (!json.file) continue
      const line = this.getClassComponentImport(json.file, relBase, folder)
      list.push(line)
    }
  },

  getClassComponentImport (cmpFile, relBase, folder) {
    const clsPath = ParseCommon.getClassPath(cmpFile, folder)
    const clsPathRel = File.relative(relBase, '/' + clsPath)
    const dottedPath = clsPathRel.startsWith('.') ? clsPathRel : './' + clsPathRel
    const clsName = ParseCommon.getClassName(cmpFile, folder)
    return `import ${clsName} from '${dottedPath}'\n`
  }
}
