const Html = require('../Html.js')
const ParseCommon = require('./ParseCommon.js')
const ParseOverride = require('./ParseOverride.js')

module.exports = {
  _splitProps: ' :: ',
  _component: {},

  getRenderBlock (body, fileType, data, lib) {
    this.reset()
    const initialHtml = this.replaceTemplate(body)
    const document = (new lib.jsdom.JSDOM(initialHtml)).window.document
    this.processNodes(data, document)
    return {
      // this one first because it removes the component attribute after extraction
      component: this.getComponentData(fileType, document),
      html: this.regexHtmlRender(fileType, data, document, lib)
    }
  },

  reset () {
    this._component = { regex: {}, defaults: {} }
  },

  replaceTemplate (html) {
    return html.replaceAll('<template', '<templatex123abc')
      .replaceAll('</template>', '</templatex123abc>')
  },

  replaceTemplateBack (html) {
    return html.replaceAll('<templatex123abc', '<template')
      .replaceAll('</templatex123abc>', '</template>')
  },

  processNodes (data, document) {
    this.injectClassComponents(document, document, data.folder)
    this.injectIfFor(document)
    this.injectComponentHole(document)
    // after if/for and hole because we don't want those attributes
    this.injectComponentOverrides(document, data.componentOverrides)
    this.cleanClasses(document, data.compiledCss)
  },

  injectClassComponents (document, container, folder) {
    for (const div of container.querySelectorAll('div.component')) {
      const component = this.getComponentNode(document, div, folder)
      div.replaceWith(component)
      this.injectClassComponents(document, component, folder)
    }
  },

  getComponentNode (document, div, folder) {
    const data = ParseCommon.getComponentData(div)
    const cmpClass = ParseCommon.getClassName(data.file, folder)
    const node = document.createElementNS('https://www.w3.org/XML/1998/namespace', cmpClass)
    this.setComponentProperties(node, data)
    node.innerHTML = div.innerHTML
    return node
  },

  setComponentProperties (cmpNode, data) {
    if (data.properties) {
      cmpNode.setAttributeNS(null, 'data-ss-properties', JSON.stringify(data.properties))
    }
  },

  injectIfFor (document) {
    for (const node of document.querySelectorAll('[data-ss-properties]')) {
      const props = this.getProperties(node)
      if ('reactIf' in props) {
        ParseCommon.wrapNode(node, 'desechIf', document, { value: props.reactIf })
      } else if ('reactFor' in props) {
        ParseCommon.wrapNode(node, 'desechFor', document, { value: props.reactFor })
      } else if ('reactIfFor' in props) {
        ParseCommon.wrapNode(node, 'desechIfFor', document, { value: props.reactIfFor })
      } else if ('reactForIf' in props) {
        ParseCommon.wrapNode(node, 'desechForIf', document, { value: props.reactForIf })
      }
      this.clearnIfForProps(node, props)
    }
  },

  getProperties (node) {
    const string = node.getAttributeNS(null, 'data-ss-properties')
    return string ? JSON.parse(string) : {}
  },

  clearnIfForProps (node, props) {
    for (const name of ['reactIf', 'reactFor', 'reactIfFor', 'reactForIf']) {
      if (name in props) delete props[name]
    }
    node.setAttributeNS(null, 'data-ss-properties', JSON.stringify(props))
  },

  injectComponentOverrides (document, overrides) {
    for (const node of document.querySelectorAll('[class*="e0"]')) {
      const ref = Html.getRef(node.classList)
      ParseOverride.injectOverrides(node, ref, overrides[ref], this._component, document)
    }
  },

  injectComponentHole (document) {
    for (const node of document.querySelectorAll('[data-ss-component-hole]')) {
      node.removeAttributeNS(null, 'data-ss-component-hole')
      node.innerHTML = '{this.props.children}'
    }
  },

  cleanClasses (document, css) {
    // getElementsByClassName doesn't work correctly with jsdom
    for (const node of document.querySelectorAll('[class*="e0"]')) {
      if (node.classList.contains('text')) {
        node.classList.remove('text')
      }
      if (!node.getAttributeNS(null, 'class')) {
        node.removeAttributeNS(null, 'class')
      }
    }
  },

  regexHtmlRender (fileType, data, document, lib) {
    let html = (fileType === 'page') ? document.body.outerHTML : document.body.innerHTML
    html = this.replaceTemplateBack(html)
    html = ParseOverride.replaceOverrides(html, this._component)
    html = html.replace(/<body([\s\S]*?)<\/body>/g, '<div$1</div>')
    html = html.replace(/<a(.*?)href="([^http].*?)"(.*?)>([\s\S]*?)<\/a>/,
      '<Link$1to="$2"$3>$4</Link>')
    html = html.replace(/<input(.*)value="(.*?)"(.*?)>/g, '<input$1defaultValue="$2"$3>')
    html = html.replace(/<(img|input|track|br)(.*?)>/g, '<$1$2 />')
    html = this.replaceCamelCaseAttributes(html)
    html = this.replaceShortAttributes(html)
    html = this.addElementClasses(html, data)
    html = this.addElementProperties(html, data)
    html = this.replaceIfForCode(html)
    html = Html.beautifyHtml(html.replace(/\r?\n/g, '\n'), lib.beautify, 3)
    return '    const render = (\n' + html + '\n    )\n'
  },

  replaceCamelCaseAttributes (html) {
    const attrs = {
      class: 'className',
      srcset: 'srcSet',
      srclang: 'srcLang',
      autoplay: 'autoPlay',
      minlength: 'minLength',
      maxlength: 'maxLength',
      readonly: 'readOnly',
      autocomplete: 'autoComplete',
      for: 'htmlFor'
    }
    for (const [name, value] of Object.entries(attrs)) {
      const regex = new RegExp(` ${name}="(.*?)"`, 'g')
      html = html.replace(regex, ` ${value}="$1"`)
    }
    return html
  },

  replaceShortAttributes (html) {
    html = html.replace(/ (checked|selected)=""/g, '')
    html = html.replace(/ (hidden|disabled|readonly|required|multiple|controls|autoplay|loop|muted|default|reversed)=".*?"/g,
      ' $1')
    return html
  },

  addElementClasses (html, data) {
    return html.replace(/className="(.*?)"/g, (match, cls) => {
      const list = cls.split(' ')
      const ref = Html.getRef(list)
      const newList = ParseOverride.overrideClasses(ref, data.componentOverrides[ref])
      console.log(newList)
    })
  },

  addElementProperties (html, data) {
    // we can't add attributes with setAttributeNS because we allow invalid html/xml attributes
    return html.replace(/(className="([^><]*?)"([^><]*?))?data-ss-properties="(.*?)"/g,
      (match, extraBlock, cls, extra, json) => {
        const props = JSON.parse(json.replaceAll('&quot;', '"'))
        const ref = Html.getRef(cls.split(' '))
        const attrs = this.getPropertyAttributes(ref, props, cls || '', data)
        return extraBlock ? (attrs + ' ' + extra).trim() : attrs
      }
    )
  },

  getPropertyAttributes (ref, props, cls, data) {
    const attrs = []
    if (!props.className && cls) attrs.push(`className="${cls}"`)
    for (const [name, value] of Object.entries(props)) {
      this.addProperty(ref, name, value, cls, attrs, data)
    }
    // add the new properties to the list
    ParseOverride.overrideNewProperties(ref, props, data.componentOverrides[ref], attrs)
    return attrs.join(' ')
  },

  addProperty (ref, name, value, cls, attrs, data) {
    const prop = this.getProperty(name, value, cls)
    const override = ParseOverride.overrideExistingProperty(ref, prop.name, prop.value,
      data.componentOverrides[ref])
    attrs.push(override || Object.values(prop).join('='))
  },

  getProperty (name, value, cls) {
    if (value.startsWith('{')) {
      return { name, value }
    } else {
      value = value.replaceAll('"', '&quot;')
      if (name === 'className') value = (cls + ' ' + value).trim()
      return { name, value: '"' + value + '"' }
    }
  },

  replaceIfForCode (html) {
    html = this.replaceIfForCombo(html)
    html = this.replaceForIfCombo(html)
    html = this.replaceIfCondition(html)
    html = this.replaceForLoop(html)
    return html
  },

  replaceIfForCombo (html) {
    // `test === 1 :: props.posts :: post` becomes
    // `{test === 1 && props.posts.map(post => <li>...</li>)}`
    return html.replace(/<desechIfFor value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]} && ${data[1]}.map(${data[2]} => `
    }).replace(/<\/desechIfFor>/g, ')}')
  },

  replaceForIfCombo (html) {
    // `props.posts :: post :: post.id > 0` becomes
    // `{props.posts.map(post => post.id > 0 && <li>...</li>}`
    return html.replace(/<desechForIf value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]}.map(${data[1]} => ${data[2]} && `
    }).replace(/<\/desechForIf>/g, ')}')
  },

  replaceIfCondition (html) {
    // `unreadMessages.length > 0` becomes `{unreadMessages.length > 0 && <div>...</div>}`
    return html.replace(/<desechIf value="(.*?)">/g, '{$1 && ').replace(/<\/desechIf>/g, '}')
  },

  replaceForLoop (html) {
    // `props.posts :: post` becomes `{props.posts.map(post => <li>...</li>}`
    return html.replace(/<desechFor value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]}.map(${data[1]} => `
    }).replace(/<\/desechFor>/g, ')}')
  },

  getComponentData (fileType, document) {
    // the main data only has variants
    const main = this.getMainComponentData(fileType, document) || {}
    const defaults = this._component.defaults
    return { ...main, defaults }
  },

  getMainComponentData (fileType, document) {
    if (fileType === 'page') return
    const root = document.body.children[0]
    const data = ParseCommon.getComponentData(root)
    if (data) root.removeAttributeNS(null, 'data-ss-component')
    return data
  }
}
