const path = require('path')
const fs = require('fs')
const ExtendJS = require('./ExtendJS.js')

module.exports = {
  getIndexHtml (html) {
    html = html.replace('<base href="">', '<base href="/">')
    html = html.replace('  <script src="js/desech.js"></script>\n', '')
    html = html.replace(/<body>[\s\S]*<\/body>/gi, '<body>\n<div id="root"></div>\n</body>')
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
    let code = ''
    for (const file of files) {
      if (file..isComponent) continue
      code += '\n' + this.getRouteImport(folder, file)
    }
    return code
  },

  getRouteImport (folder, file) {
    const dir = this.getClassDir(file.path, folder)
    const cls = this.getClassName(file.name)
    return `import ${cls} from './page${dir}/${cls}.js'`
  },

  getRoutePaths (folder, files) {
    const routes = []
    for (const file of files) {
      if (file..isComponent) continue
      routes.push(this.getRoutePath(folder, file, ))
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
    return (dir === '/') ? '' : dir.replace(/[^a-z0-9\/]/gi, '')
  },

  getClassName (fileName) {
    return ExtendJS.capitalize(this.getClassPage(fileName))
  },

  getClassPage (fileName) {
    return path.basename(fileName, '.html').replace(/[^a-z0-9]/gi, '')
  },

  getJsFile (folder, filePath, type) {
    let dir = this.getClassDir(filePath, folder)
    const cls = this.getClassName(path.basename(filePath))
    return folder + `/_export/src/${type}${dir}/${cls}.js`
  },

  getJsCode (js, file, relBase) {
    const body = this.getClassBody(file.path)
    // init
    js = this.injectCode(js, 'className', this.getClassName(file.name))

    // edit
    // \nWARNING: the import code will be overwritten by desech, on each project save
    js = this.injectCode(js, 'classImport', this.getClassImport(body, relBase))
    // \nWARNING: the render return will be overwritten by desech, on each project save
    // if you do want to add html attributes, then do so in desech, not here in the file
    // replace \n with \n + 4 tabs
    js = this.injectCode(js, 'classRender', this.getClassRender(body))
    return js
  },

  getClassBody (filePath) {
    const body = fs.readFileSync(filePath).toString()
    // components don't have <body>
    if (body.indexOf('<body>') === -1) return body
    const match = /<body>([\s\S]*)<\/body>/gi.exec(body)
    return (match && match[1]) ? match[1].trim() : ''
  },

  getClassImport (html, relBase) {
    let code = ''
    if (html.indexOf('</a>') >= 0) code += "\nimport { Link } from 'react-router-dom'"
    code += this.getClassComponentImports(html, relBase)
    return code
  },

  getClassComponentImports (html, relBase) {
    let code = ''
    const matches = html.matchAll(/<script type="text\/html" src="component(?<component>.*).html"><\/script>/gi)
    for (const match of matches) {
      code += this.getClassComponentImport(match.groups.component, relBase)
    }
    return code
  },

  getClassComponentImport (htmlFile, relBase) {
    const component = this.getClassName(htmlFile)
    const relFile = `/component${this.getClassDir(htmlFile)}/${component}.js`
    const importPath = path.relative(relBase, relFile)
    return `\nimport ${component} from '${importPath}'`
  },

  getClassRender (html) {
    html = html.replace(/ class="/gi, ' className="')
    html = html.replace(/<a /gi, '<Link ').replace(/ href="/gi, ' to="')
      .replace(/<\/a>/gi, '</Link>')
    html = this.injectClassComponents(html)
    return html
  },

  injectClassComponents (html) {
    const regex = /<script type="text\/html" src="component(.*)"><\/script>/gi
    return html.replace(regex, (match, file) => `<${this.getClassName(file)} />`)
  }
}
