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
    const imports = this.getClassImports(htmlFiles, folder).join('')
    js = this.injectJs(js, imports, 'import')
    const routes = this.getRoutePaths(htmlFiles, folder).join('')
    js = this.injectJsx(js, routes, 'router', 8)
    return js
  },

  getClassImports (files, folder) {
    const list = []
    for (const file of files) {
      if (file.isComponent) continue
      const clsName = ParseCommon.getClassName(file.path, folder)
      const clsPath = ParseCommon.getClassPath(file.path, folder)
      list.push(`import ${clsName} from './${clsPath}'\n`)
    }
    return ExtendJS.unique(list)
  },

  getRoutePaths (files, folder) {
    const list = []
    for (const file of files) {
      if (file.isComponent) continue
      let route = file.path.replace(folder, '')
      if (route.includes('/index')) route = File.dirname(route)
      const cls = ParseCommon.getClassName(file.path, folder)
      list.push(`        <Route path="${route}" element={<${cls} />} />\n`)
    }
    return ExtendJS.unique(list).sort().reverse()
  },

  injectJs (string, snippet, location, spaces = 0) {
    const regex = new RegExp(`(\\/\\/ desech - start ${location} block\r?\n)` +
      `([\\s\\S]*?)([ ]{${spaces}}\\/\\/ desech - end ${location} block)`, 'g')
    return string.replace(regex, `$1${snippet}$3`)
  },

  injectJsx (string, snippet, location, spaces = 0) {
    const regex = new RegExp(`({\\/\\* desech - start ${location} block \\*\\/}\r?\n)` +
      `([\\s\\S]*?)([ ]{${spaces}}{\\/\\* desech - end ${location} block ` +
      '\\*\\/})', 'g')
    return string.replace(regex, `$1${snippet}$3`)
  },

  getClassJsFile (folder, filePath) {
    const clsPath = ParseCommon.getClassPath(filePath, folder)
    return File.resolve(folder, `_export/src/${clsPath}`)
  },

  parseClassJsCode (js, file, relBase, data, lib) {
    const body = this.getClassBody(file.path)
    if (!body) return
    const render = ParseRender.getRenderBlock(body, file, data, lib)
    js = this.injectJs(js, render.html, 'render', 4)
    const overrideImports = []
    const componentData = this.getComponentData(body, render.component, overrideImports)
    js = this.injectJs(js, componentData, 'data', 4)
    const importCode = this.getComponentImports(body, relBase, data, overrideImports)
    js = this.injectJs(js, importCode, 'import')
    js = this.injectJs(js, this.getPropTypes(render.component), 'types', 2)
    return js
  },

  getClassBody (filePath) {
    const body = File.readFile(filePath)
    if (!body) return
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
    if (ExtendJS.isEmpty(data)) return
    for (const [name, value] of Object.entries(data)) {
      if (name === 'component') {
        this.addInstance(data, value, overrideImports)
      } else if (typeof value === 'object') {
        this.replaceComponentInstances(value, overrideImports)
      }
    }
  },

  // overrides have "component/file.html", while defaults have "ComponentFoo"
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

  getComponentImports (body, relBase, data, overrideImports) {
    const list = []
    list.push(`import DS from '${File.relative(relBase, '/lib/DS.js')}'`)
    this.addClassComponentImports(list, body, relBase, data)
    this.addInstanceOverridesImport(list, relBase, data.folder, overrideImports)
    return ExtendJS.unique(list).join('\n') + '\n'
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
  },

  getPropTypes (data) {
    let js = this.getPropTypesVariants(data?.variants)
    js += '  dRef: PropTypes.string,\n'
    js += '  dOverrides: PropTypes.object\n'
    return js
  },

  getPropTypesVariants (variants) {
    let js = ''
    if (variants) {
      for (const [name, obj] of Object.entries(variants)) {
        // add the empty string option too
        const list = ['', ...Object.keys(obj)].map(val => `'${val}'`).join(', ')
        js += `  dVar${ExtendJS.toPascalCase(name)}: PropTypes.oneOf([${list}]),\n`
      }
    }
    return js
  }
}
