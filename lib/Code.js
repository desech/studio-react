const path = require('path')
const fs = require('fs')
const ExtendJS = require('./ExtendJS.js')

module.exports = {
  _splitProps: ' || ',

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
    this.injectIfFor(dom.window.document)
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

  injectIfFor (document) {
    for (const tag of document.querySelectorAll('[data-programming-properties]')) {
      const props = JSON.parse(tag.dataset.programmingProperties.replaceAll('&quot;', '"'))
      if ('reactIf' in props) {
        this.injectIfForTag('if', document, tag, props.reactIf)
      } else if ('reactFor' in props) {
        this.injectIfForTag('for', document, tag, props.reactFor)
      } else if ('reactIfFor' in props) {
        this.injectIfForTag('iffor', document, tag, props.reactIfFor)
      } else if ('reactForIf' in props) {
        this.injectIfForTag('forif', document, tag, props.reactForIf)
      }
      this.clearnIfForProps(tag, props)
    }
  },

  injectIfForTag (type, document, tag, value) {
    // wrap the tag with an <if></if>, <for></for>, <iffor></iffor> or <forif></forif>
    const wrapper = document.createElementNS('http://www.w3.org/1999/xhtml', type)
    wrapper.setAttributeNS(null, 'value', value)
    tag.parentNode.insertBefore(wrapper, tag)
    wrapper.appendChild(tag)
  },

  clearnIfForProps (tag, props) {
    for (const name of ['reactIf', 'reactFor', 'reactIfFor', 'reactForIf']) {
      if (name in props) delete props[name]
    }
    tag.dataset.programmingProperties = JSON.stringify(props)
  },

  regexHtmlRender (html) {
    html = html.replace(/<div class="component-children(.*?)><\/div>/g, '{this.props.children}')
    html = html.replace(/<a /g, '<Link ').replace(/ href="/g, ' to="')
      .replace(/<\/a>/g, '</Link>')
    html = html.replace(/<(img|input|track)(.*?)>/g, '<$1$2 />')
    html = this.replaceCamelCaseAttributes(html)
    html = this.replaceShortAttributes(html)
    html = this.addProgrammingProperties(html)
    html = this.replaceIfForCode(html)
    html = html.replaceAll('\n', '\n      ')
    return html
  },

  replaceShortAttributes (html) {
    html = html.replace(/ (checked|selected)=""/g, '')
    html = html.replace(/ (hidden|disabled|readonly|required|multiple|controls|autoplay|loop|muted|default|reversed)=".*?"/g, ' $1')
    return html
  },

  replaceCamelCaseAttributes (html) {
    const attrs = {
      class: 'className',
      srcset: 'srcSet',
      srclang: 'srcLang',
      autoplay: 'autoPlay',
      minlength: 'minLength',
      maxlength: 'maxLength',
      readonly: 'readOnly'
    }
    for (const [name, value] of Object.entries(attrs)) {
      const regex = new RegExp(` ${name}="(.*?)"`, 'g')
      html = html.replace(regex, ` ${value}="$1"`)
    }
    return html
  },

  addProgrammingProperties (html) {
    return html.replace(/data-programming-properties="(.*?)"/g, (match, json) => {
      const props = JSON.parse(json.replaceAll('&quot;', '"'))
      const attrs = []
      for (const [name, value] of Object.entries(props)) {
        attrs.push(this.getProgrammingProperty(name, value))
      }
      return attrs.join(' ')
    })
  },

  getProgrammingProperty (name, value) {
    if (value.startsWith('{')) {
      return `${name}=${value}`
    } else {
      return `${name}="${value.replaceAll('"', '&quot;')}"`
    }
  },

  replaceIfForCode (html) {
    html = this.replaceIfForCombo(html)
    html = this.replaceForIfCombo(html)
    html = this.replaceIfCondition(html)
    html = this.replaceForLoop(html)
    return html
  },

  replaceIfCondition (html) {
    // `unreadMessages.length > 0` becomes `{unreadMessages.length > 0 && <div>...</div>}`
    return html.replace(/<if value="(.*?)">/g, '{$1 && ').replace(/<\/if>/g, '}')
  },

  replaceForLoop (html) {
    // `props.posts || post` becomes `{props.posts.map(post => <li>...</li>}`
    return html.replace(/<for value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]}.map(${data[1]} => `
    }).replace(/<\/for>/g, ')}')
  },

  replaceIfForCombo (html) {
    // `test === 1 || props.posts || post` becomes
    // `{test === 1 && props.posts.map(post => <li>...</li>)}`
    return html.replace(/<iffor value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]} && ${data[1]}.map(${data[2]} => `
    }).replace(/<\/iffor>/g, ')}')
  },

  replaceForIfCombo (html) {
    // `props.posts || post || post.id > 0` becomes
    // `{props.posts.map(post => post.id > 0 && <li>...</li>}`
    return html.replace(/<forif value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]}.map(${data[1]} => ${data[2]} && `
    }).replace(/<\/forif>/g, ')}')
  }
}
