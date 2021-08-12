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
    html = html.replace(/<body>[\s\S]*<\/body>/g, '<body>\n  <div id="root"></div>\n</body>')
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

  getFiles (folder, files, type, callback) {
    const list = []
    for (const file of files) {
      if (!type || (type === 'page' && !file.isComponent) ||
        (type === 'component' && file.isComponent)) {
        list.push(this[callback](folder, file))
      }
    }
    return ExtendJS.unique(list)
  },

  getClassImport (folder, file) {
    const dir = ParseCommon.getClassDir(file.path, folder)
    const cls = ParseCommon.getClassName(file.name)
    const parent = file.isComponent ? '' : '/page'
    return `import ${cls} from '.${parent}${dir}/${cls}.js'\n`
  },

  getRoutePath (folder, file) {
    const clsDir = ParseCommon.getClassDir(file.path, folder)
    const clsFile = ParseCommon.getClassFile(file.name)
    let route = File.resolve(clsDir, clsFile)
    if (route.endsWith('/index')) route = route.replace('/index', '/')
    const cls = ParseCommon.getClassName(file.name)
    return `        <Route path="${route}"><${cls} /></Route>\n`
  },

  getClassJsFile (folder, filePath, type) {
    filePath = (type === 'component') ? filePath.replace('/component', '') : filePath
    const dir = ParseCommon.getClassDir(filePath, folder)
    const cls = ParseCommon.getClassName(File.basename(filePath))
    return File.resolve(folder, `_export/src/${type}${dir}/${cls}.js`)
  },

  parseClassJsCode (js, file, relBase, css, JSDOM) {
    const body = this.getClassBody(file.path)
    const rendered = ParseRender.getRenderBlock(body, css, JSDOM)
    js = this.injectJs(js, rendered, 'render', 4)
    js = this.injectJs(js, this.getCodeImport(body, rendered, relBase), 'import')
    return js
  },

  getClassBody (filePath) {
    const body = fs.readFileSync(filePath).toString()
    // components don't have <body>
    if (body.indexOf('<body>') === -1) return body
    const match = /<body>([\s\S]*)<\/body>/g.exec(body)
    return (match && match[1]) ? match[1].trim() : ''
  },

  getCodeImport (body, rendered, relBase) {
    const list = []
    if (rendered.indexOf('</Link>') >= 0) {
      list.push("import { Link } from 'react-router-dom'\n")
    }
    this.setClassComponentImports(list, body, relBase)
    return ExtendJS.unique(list).join('')
  },

  setClassComponentImports (list, body, relBase) {
    const matches = body.matchAll(/<div class="component" src="component(.*?).html".*?>/g)
    for (const match of matches) {
      const line = this.getClassComponentImport(match[1], relBase)
      list.push(line)
    }
  },

  getClassComponentImport (htmlFile, relBase) {
    const component = ParseCommon.getClassName(htmlFile)
    const relFile = `/component${ParseCommon.getClassDir(htmlFile)}/${component}.js`
    const importPath = File.relative(relBase, relFile)
    const dottedPath = importPath.startsWith('.') ? importPath : './' + importPath
    return `import ${component} from '${dottedPath}'\n`
  }
}
