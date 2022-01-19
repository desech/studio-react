const Html = require('../Html.js')
const ExtendJS = require('../ExtendJS.js')
const ParseRegex = require('./ParseRegex.js')
const ParseCommon = require('./ParseCommon.js')
const ParseOverride = require('./ParseOverride.js')

module.exports = {
  _component: {},

  getRenderBlock (body, file, data, lib) {
    this.reset()
    const initialHtml = ParseRegex.replaceTemplate(body)
    const document = (new lib.jsdom.JSDOM(initialHtml)).window.document
    this.processNodes(file, data, document)
    const component = this.processMainComponentData(file, document)
    const html = ParseRegex.regexHtmlRender(file, data, this._component, document, lib)
    if (!ExtendJS.isEmpty(this._component.defaults)) {
      component.defaults = this._component.defaults
    }
    return { component, html }
  },

  reset () {
    this._component = { regex: {}, defaults: {} }
  },

  processNodes (file, data, document) {
    this.injectRootData(document.body.children[0], file, data.folder)
    this.injectClassComponents(document, data.folder)
    this.injectIfFor(document)
    this.injectComponentHole(document)
    // after if/for and hole because we don't want those attributes
    this.injectComponentOverrides(document, data.component.overrides)
    this.cleanClasses(document)
  },

  injectRootData (root, file, folder) {
    if (!file.isComponent) return
    const cssClass = ParseCommon.getCssClass(file.path, folder)
    root.classList.add(cssClass)
    root.classList.add('__ROOT_CLASS__')
    // we want data-variant="" all the time because of how css works
    root.setAttributeNS(null, '__ROOT_VARIANTS__', '')
  },

  injectClassComponents (document, folder) {
    // you can't just for loop through it because we replace nodes
    let div
    while (div = document.querySelector('div.component')) { // eslint-disable-line
      const component = this.getComponentNode(document, div, folder)
      div.replaceWith(component)
    }
  },

  getComponentNode (document, node, folder) {
    const data = ParseCommon.getComponentData(node)
    const cmpInstance = ParseCommon.getClassName(data.file, folder)
    const clone = document.createElementNS('https://www.w3.org/XML/1998/namespace', cmpInstance)
    this.setComponentProperties(clone, data)
    this.setComponentData(clone, data)
    Html.transferChildren(node, clone)
    return clone
  },

  setComponentProperties (node, data) {
    // we set the properties as an attribute, and process them in the the same way as elements
    if (data.properties) {
      node.setAttributeNS(null, 'data-ss-properties', JSON.stringify(data.properties))
    }
  },

  setComponentData (node, data) {
    node.setAttributeNS(null, 'dRef', data.ref)
    this.setComponentDataOverrides(node, data)
    this.setComponentDataVariants(node, data)
  },

  // we need overrides and variants all the time because the way props are passed around
  setComponentDataOverrides (node, data) {
    node.setAttributeNS(null, '__COMPONENT_OVERRIDES__' + data.ref, '')
    if (data.overrides) {
      if (!this._component.defaults[data.ref]) this._component.defaults[data.ref] = {}
      this._component.defaults[data.ref].overrides = data.overrides
    }
  },

  setComponentDataVariants (node, data) {
    node.setAttributeNS(null, '__COMPONENT_VARIANTS__' + data.ref, data.file)
    if (data.variants) {
      if (!this._component.defaults[data.ref]) this._component.defaults[data.ref] = {}
      this._component.defaults[data.ref].variants = data.variants
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
    if (ExtendJS.isEmpty(props)) {
      node.removeAttributeNS(null, 'data-ss-properties')
    } else {
      node.setAttributeNS(null, 'data-ss-properties', JSON.stringify(props))
    }
  },

  injectComponentOverrides (document, overrides) {
    for (const node of document.querySelectorAll('[class*="e0"], [dRef]')) {
      const ref = this.getNodeRef(node)
      ParseOverride.injectOverrides(node, ref, overrides[ref], this._component, document)
    }
  },

  getNodeRef (node) {
    return node.classList.length ? Html.getRef(node.classList) : node.getAttributeNS(null, 'dRef')
  },

  injectComponentHole (document) {
    for (const node of document.querySelectorAll('[data-ss-component-hole]')) {
      node.removeAttributeNS(null, 'data-ss-component-hole')
      node.innerHTML = '{this.props.children}'
    }
  },

  cleanClasses (document) {
    // getElementsByClassName doesn't work correctly with jsdom
    for (const node of document.querySelectorAll('[class*="e0"]')) {
      if (node.classList.contains('text')) {
        node.classList.remove('text')
      }
    }
  },

  processMainComponentData (file, document) {
    if (!file.isComponent) return {}
    const root = document.body.children[0]
    const mainData = ParseCommon.getComponentData(root)
    if (!mainData) return {}
    root.removeAttributeNS(null, 'data-ss-component')
    return {
      variants: mainData.variants,
      variantMap: this.getVariantMap(mainData.variants)
    }
  },

  getVariantMap (variants) {
    const map = {}
    for (const name of Object.keys(variants)) {
      map[name] = ExtendJS.toPascalCase(name)
    }
    return map
  }
}
