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
    return {
      // this one first because it removes the component attribute after extraction
      component: this.getComponentData(file.isComponent, document),
      html: ParseRegex.regexHtmlRender(file.isComponent, data, this._component, document, lib)
    }
  },

  reset () {
    this._component = { regex: {}, defaults: {} }
  },

  processNodes (file, data, document) {
    this.injectRootData(document.body.children[0], file, data.folder)
    this.injectClassComponents(document, document, data.folder)
    this.injectIfFor(document)
    this.injectComponentHole(document)
    // after if/for and hole because we don't want those attributes
    this.injectComponentOverrides(document, data.componentOverrides)
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
    this.setComponentData(node, data)
    node.innerHTML = div.innerHTML
    return node
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
    node.setAttributeNS(null, '__COMPONENT_VARIANTS__' + data.ref, '')
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

  getComponentData (isComponent, document) {
    const data = {}
    if (isComponent) {
      const main = this.getMainComponentData(document.body.children[0])
      if (main?.variants) data.variants = main.variants
    }
    if (!ExtendJS.isEmpty(this._component.defaults)) {
      data.defaults = this._component.defaults
    }
    return data
  },

  getMainComponentData (root) {
    const mainData = ParseCommon.getComponentData(root)
    if (mainData) root.removeAttributeNS(null, 'data-ss-component')
    return mainData
  }
}
