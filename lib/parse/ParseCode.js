const path = require('path')
const fs = require('fs')
const ExtendJS = require('../ExtendJS.js')
const ParseCommon = require('./ParseCommon.js')
const ParseRender = require('./ParseRender.js')

module.exports = {
  getIndexHtml (html) {
    html = html.replace('<base href="">', '<base href="/">')
    html = html.replace(/<link[\s\S]*.css">/g,
      '<link rel="stylesheet" href="css/compiled/style.css">')
    html = html.replace('<script src="js/script.js"></script>', '')
    html = html.replace(/<body>[\s\S]*<\/body>/g, '<body>\n<div id="root"></div>\n</body>')
    return html
  },

  getAppJs (js, folder, htmlFiles) {
    js = this.injectJs(js, this.getRouteImports(folder, htmlFiles), 'import')
    js = this.injectJsx(js, this.getRoutePaths(folder, htmlFiles), 'router', 8)
    return js
  },

  injectJs (js, snippet, location) {
    const regex = new RegExp(`(\\/\\/ desech studio - start ${location} block\n)([\\s\\S]*?)` +
      `(\\/\\/ desech studio - end ${location} block)`, 'g')
    return js.replace(regex, `$1${snippet}$3`)
  },

  injectJsx (js, snippet, location, spaces) {
    const regex = new RegExp(`({\\/\\* desech studio - start ${location} block \\*\\/}\n)` +
      `([\\s\\S]*?)([ ]{${spaces}}{\\/\\* desech studio - end ${location} block \\*\\/})`, 'g')
    return js.replace(regex, `$1${snippet}$3`)
  },

  getRouteImports (folder, files) {
    const list = []
    for (const file of files) {
      if (file.isComponent) continue
      list.push(this.getRouteImport(folder, file))
    }
    return ExtendJS.unique(list).join('')
  },

  getRouteImport (folder, file) {
    const dir = ParseCommon.getClassDir(file.path, folder)
    const cls = ParseCommon.getClassName(file.name)
    return `import ${cls} from './page${dir}/${cls}.js'\n`
  },

  getRoutePaths (folder, files) {
    const routes = []
    for (const file of files) {
      if (file.isComponent) continue
      routes.push(this.getRoutePath(folder, file))
    }
    // we want the routes in descending order
    return routes.sort().reverse().join('')
  },

  getRoutePath (folder, file) {
    let route = ParseCommon.getClassDir(file.path, folder) + '/' +
      ParseCommon.getClassPage(file.name)
    if (route.indexOf('/index') >= 0) route = route.replace('/index', '/')
    const cls = ParseCommon.getClassName(file.name)
    return `        <Route path="${route}"><${cls} /></Route>\n`
  },

  getClassJsFile (folder, filePath, type) {
    const dir = ParseCommon.getClassDir(filePath, folder)
    const cls = ParseCommon.getClassName(path.basename(filePath))
    return folder + `/_export/src/${type}${dir}/${cls}.js`
  },

  getClassJsCode (js, file, relBase, JSDOM) {
    const body = this.getClassBody(file.path)
    const dom = new JSDOM(body)
    js = this.injectJs(js, this.getClassImport(body, relBase), 'import')
    js = this.injectJs(js, ParseRender.getRenderBlock(dom), 'render', 4)
    return js
  },

  getClassBody (filePath) {
    const body = fs.readFileSync(filePath).toString()
    // components don't have <body>
    if (body.indexOf('<body>') === -1) return body
    const match = /<body>([\s\S]*)<\/body>/g.exec(body)
    return (match && match[1]) ? match[1].trim() : ''
  },

  getClassImport (html, relBase) {
    const list = []
    if (html.indexOf('</a>') >= 0) list.push("import { Link } from 'react-router-dom'\n")
    this.setClassComponentImports(list, html, relBase)
    return ExtendJS.unique(list).join('')
  },

  setClassComponentImports (list, html, relBase) {
    const matches = html.matchAll(/<div class="component" src="component(.*?).html">/g)
    for (const match of matches) {
      const line = this.getClassComponentImport(match[1], relBase)
      list.push(line)
    }
  },

  getClassComponentImport (htmlFile, relBase) {
    const component = ParseCommon.getClassName(htmlFile)
    const relFile = `/component${ParseCommon.getClassDir(htmlFile)}/${component}.js`
    const importPath = path.relative(relBase, relFile)
    const dottedPath = importPath.startsWith('.') ? importPath : './' + importPath
    return `import ${component} from '${dottedPath}'\n`
  }
}
