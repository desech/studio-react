const path = require('path')
const fs = require('fs')
const ExtendJS = require('./ExtendJS.js')

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
    js = this.injectCode(js, 'routeImport', this.getRouteImports(folder, htmlFiles))
    js = this.injectCode(js, 'routePath', this.getRoutePaths(folder, htmlFiles))
    return js
  },

  injectCode (content, id, code) {
    // double escaping
    return content.replaceAll(`/*{{${id}}}*/`, code)
  },

  getRouteImports (folder, files) {
    const list = []
    for (const file of files) {
      if (file.isComponent) continue
      list.push(this.getRouteImport(folder, file))
    }
    const code = ExtendJS.unique(list).join('\n')
    return code ? '\n' + code : ''
  },

  getRouteImport (folder, file) {
    const dir = this.getClassDir(file.path, folder)
    const cls = this.getClassName(file.name)
    return `import ${cls} from './page${dir}/${cls}.js'`
  },

  getRoutePaths (folder, files) {
    const routes = []
    for (const file of files) {
      if (file.isComponent) continue
      routes.push(this.getRoutePath(folder, file))
    }
    // we want the routes in descending order
    return routes.sort().reverse().join('\n        ')
  },

  getRoutePath (folder, file) {
    let route = this.getClassDir(file.path, folder) + '/' + this.getClassPage(file.name)
    if (route.indexOf('/index') >= 0) route = route.replace('/index', '/')
    const cls = this.getClassName(file.name)
    return `<Route path="${route}"><${cls} /></Route>`
  },

  getClassDir (filePath, folder = '') {
    const dir = path.dirname(filePath.replace(folder, ''))
    return (dir === '/') ? '' : dir.replace(/[^a-z0-9/]/g, '')
  },

  getClassName (fileName) {
    return ExtendJS.capitalize(this.getClassPage(fileName))
  },

  getClassPage (fileName) {
    return path.basename(fileName, '.html').replace(/[^a-z0-9]/g, '')
  },

  getJsFile (folder, filePath, type) {
    const dir = this.getClassDir(filePath, folder)
    const cls = this.getClassName(path.basename(filePath))
    return folder + `/_export/src/${type}${dir}/${cls}.js`
  },

  getJsCode (js, file, relBase, JSDOM) {
    const body = this.getClassBody(file.path)
    const dom = new JSDOM(body)
    js = this.injectCode(js, 'className', this.getClassName(file.name))
    js = this.injectCode(js, 'classImport', this.getClassImport(body, relBase))
    js = this.injectCode(js, 'classRender', this.getClassRenderBlock(dom))
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
    if (html.indexOf('</a>') >= 0) list.push("import { Link } from 'react-router-dom'")
    this.setClassComponentImports(list, html, relBase)
    const code = ExtendJS.unique(list).join('\n')
    return code ? '\n' + code : ''
  },

  setClassComponentImports (list, html, relBase) {
    const matches = html.matchAll(/<div class="component" src="component(.*?).html">/g)
    for (const match of matches) {
      const line = this.getClassComponentImport(match[1], relBase)
      list.push(line)
    }
  },

  getClassComponentImport (htmlFile, relBase) {
    const component = this.getClassName(htmlFile)
    const relFile = `/component${this.getClassDir(htmlFile)}/${component}.js`
    const importPath = path.relative(relBase, relFile)
    const dottedPath = importPath.startsWith('.') ? importPath : './' + importPath
    return `import ${component} from '${dottedPath}'`
  },

  getClassRenderBlock (dom) {
    this.injectClassComponents(dom.window.document, dom.window.document)
    const html = dom.window.document.body.innerHTML
    return this.regexHtmlRender(html)
  },

  injectClassComponents (document, container) {
    for (const comp of container.querySelectorAll('div.component')) {
      const cls = this.getClassName(comp.getAttributeNS(null, 'src'))
      const tag = document.createElementNS('https://www.w3.org/XML/1998/namespace', cls)
      tag.innerHTML = comp.innerHTML
      comp.replaceWith(tag)
      this.injectClassComponents(document, tag)
    }
  },

  regexHtmlRender (html) {
    html = html.replace(/<div class="component-children(.*?)><\/div>/g, '{this.props.children}')
    html = html.replace(/ class="/g, ' className="')
    html = html.replace(/<a /g, '<Link ').replace(/ href="/g, ' to="')
      .replace(/<\/a>/g, '</Link>')
    html = html.replace(/<(img|input)(.*?)>/g, '<$1$2/>')
    html = html.replaceAll('\n', '\n      ')
    return html
  }
}
