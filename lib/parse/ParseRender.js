const Html = require('../Html.js')
const ExtendJS = require('../ExtendJS.js')
const ParseCommon = require('./ParseCommon.js')
const ParseOverride = require('./ParseOverride.js')

module.exports = {
  _splitProps: ' :: ',
  _component: {},

  getRenderBlock (body, file, data, lib) {
    this.reset()
    const initialHtml = this.replaceTemplate(body)
    const document = (new lib.jsdom.JSDOM(initialHtml)).window.document
    this.processNodes(file, data, document)
    return {
      // this one first because it removes the component attribute after extraction
      component: this.getComponentData(file.isComponent, document),
      html: this.regexHtmlRender(file.isComponent, data, document, lib)
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

  processNodes (file, data, document) {
    this.injectRootData(document.body.children[0], file, data.folder)
    this.injectClassComponents(document, document, data.folder)
    this.injectIfFor(document)
    this.injectComponentHole(document)
    // after if/for and hole because we don't want those attributes
    this.injectComponentOverrides(document, data.componentOverrides)
    this.cleanClasses(document, data.compiledCss)
  },

  injectRootData (root, file, folder) {
    if (!file.isComponent) return
    const ref = Html.getRef(root.classList)
    const cssClass = ParseCommon.getCssClass(file.path, folder)
    root.classList.add(cssClass)
    root.classList.add(`__ROOT_CLASS__${ref}`)
    this.injectRootVariants(root, ref)
  },

  injectRootVariants (root, ref) {
    const cmpData = ParseCommon.getComponentData(root)
    if (cmpData) {
      root.setAttributeNS(null, `__ROOT_VARIANTS_${ref}`, '')
    }
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
    const cmpInstance = ParseCommon.getClassName(data.file, folder)
    const node = document.createElementNS('https://www.w3.org/XML/1998/namespace', cmpInstance)
    this.setComponentProperties(node, data)
    node.innerHTML = div.innerHTML
    return node
  },

  setComponentProperties (cmpNode, data) {
    // we set them as attributes like elements are, because we will process them with the same code
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

  regexHtmlRender (isComponent, data, document, lib) {
    let html = isComponent ? document.body.innerHTML : document.body.outerHTML
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
    html = this.addRootElementData(html)
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
    const regex = / (hidden|disabled|readonly|required|multiple|controls|autoplay|loop|muted|default|reversed)=".*?"/g
    html = html.replace(regex, ' $1')
    return html
  },

  addElementClasses (html, data) {
    return html.replace(/className="(.*?)"/g, (match, classes) => {
      const stringClasses = classes.split(' ')
      const ref = Html.getRef(stringClasses)
      const codeClasses = ParseOverride.overrideClasses(ref, stringClasses,
        data.componentOverrides[ref])
      return this.buildClassesAttribute(stringClasses, codeClasses)
    })
  },

  buildClassesAttribute (stringClasses, codeClasses) {
    if (codeClasses) {
      return 'className={`' + [...stringClasses, ...codeClasses].join(' ') + '`}'
    } else {
      return `className="${stringClasses.join(' ')}"`
    }
  },

  addElementProperties (html, data) {
    // we can't add attributes with setAttributeNS because we allow invalid html/xml attributes
    const regex = /(className="([^><]*?)"([^><]*?))?data-ss-properties="(.*?)"/g
    return html.replace(regex, (match, extraGroup, classes, extraAttr, json) => {
      const props = JSON.parse(json.replaceAll('&quot;', '"'))
      const ref = Html.getRef(classes.split(' '))
      const attrs = this.getPropertyAttributes(ref, props, data)
      return extraGroup ? (attrs + ' ' + extraAttr).trim() : attrs
    })
  },

  getPropertyAttributes (ref, props, data) {
    const attrs = []
    for (const [name, value] of Object.entries(props)) {
      this.addProperty(ref, name, value, attrs, data)
    }
    // add the new properties to the list
    ParseOverride.overrideNewProperties(ref, props, data.componentOverrides[ref], attrs)
    return attrs.join(' ')
  },

  addProperty (ref, name, value, attrs, data) {
    const prop = this.getProperty(name, value)
    const override = ParseOverride.overrideExistingProperty(ref, prop.name, prop.value,
      data.componentOverrides[ref])
    attrs.push(override || Object.values(prop).join('='))
  },

  getProperty (name, value) {
    if (value.startsWith('{')) {
      return { name, value }
    } else {
      value = value.replaceAll('"', '&quot;')
      return { name, value: '"' + value + '"' }
    }
  },

  addRootElementData (html) {
    html = this.addRootElementClass(html)
    html = this.addRootElementVariants(html)
    return html
  },

  // we add the __ROOT_CLASS and then we process the class overrides
  addRootElementClass (html) {
    const regex = /className=("|{`)(.*?__ROOT_CLASS__(e0[a-z0-9]+).*?)("|`})/g
    return html.replace(regex, (match, q1, classString, ref, q2) => {
      const classes = ExtendJS.splitByCharacter(classString, ' ', '{', '}')
      const list = this.getRootClassList(classes, ref)
      return this.buildClassesAttribute(list.string, list.code)
    })
  },

  getRootClassList (classes, ref) {
    const list = { string: [], code: [] }
    for (const cls of classes) {
      if (cls.startsWith('__ROOT_CLASS__e0')) {
        list.code.push('${d.' + ref + 'Ref}')
      } else if (cls.startsWith('${d.e0')) {
        list.code.push(cls)
      } else {
        list.string.push(cls)
      }
    }
    return list
  },

  addRootElementVariants (html, data) {
    return html.replace(/__ROOT_VARIANTS_(e0[a-z0-9]+)=""/g, (match, ref) => {
      return 'data-variant={d.' + ref + 'Variants}'
    })
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

  getComponentData (isComponent, document) {
    const data = {}
    const main = isComponent ? this.getMainComponentData(document) : {}
    // the main data only has variants
    if (main?.variants) data.variants = main.variants
    if (!ExtendJS.isEmpty(this._component.defaults)) {
      data.defaults = this._component.defaults
    }
    return data
  },

  getMainComponentData (document) {
    const root = document.body.children[0]
    const data = ParseCommon.getComponentData(root)
    if (data) root.removeAttributeNS(null, 'data-ss-component')
    return data
  }
}
