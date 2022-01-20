const Html = require('../Html.js')
const ExtendJS = require('../ExtendJS.js')
const ParseRegex = require('./ParseRegex.js')
const ParseCommon = require('./ParseCommon.js')
const ParseOverride = require('./ParseOverride.js')

module.exports = {
  _component: {},

  getRenderBlock (body, file, data, lib) {
    this.reset()
    const document = (new lib.jsdom.JSDOM(body)).window.document
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
    this.replaceTemplates(document)
    this.replaceAttributes(document)
    this.injectComponentRootData(document.body.children[0], file, data.folder)
    this.injectComponentInstances(document, file, data.folder)
    this.injectIfFor(document)
    this.injectComponentHole(document)
    // after if/for and hole because we don't want those attributes
    this.injectComponentOverrides(document, data.component.overrides)
    // at the end because we are messing with data-ss-properties
    this.prepareProperties(document)
    this.revertTemplates(document)
  },

  // because <template>s are traversed differently, we need to temporarily change them to another
  // tag <template-desech>, and then we will revert them back
  replaceTemplates (document) {
    Html.changeAllNodes('template', document, node => {
      Html.changeTag(node, 'template-desech', document)
    })
  },

  revertTemplates (document) {
    Html.changeAllNodes('template-desech', document, node => {
      Html.changeTag(node, 'template', document)
    })
  },

  replaceAttributes (document) {
    const camelMap = ParseCommon.getCamelCaseAttributeMap()
    for (const node of document.querySelectorAll('*')) {
      // skip svg children elements, but we do want <track> and <option>
      if (Html.getTag(node) !== 'svg' && node.closest('svg')) continue
      for (const [name, value] of Object.entries(Html.getAttributes(node))) {
        this.replaceAttribute(node, name, value, camelMap)
      }
    }
  },

  replaceAttribute (node, name, value, camelMap) {
    if (camelMap[name]) {
      value = ParseCommon.getAttributeValue(camelMap[name], value)
      node.setAttributeNS(null, camelMap[name], value)
      node.removeAttributeNS(null, name)
    } else {
      value = ParseCommon.getAttributeValue(name, value)
      node.setAttributeNS(null, name, value)
    }
  },

  injectComponentRootData (root, file, folder) {
    if (!file.isComponent) return
    const cssClass = ParseCommon.getCssClass(file.path, folder)
    const classes = root.getAttributeNS(null, 'className')
    root.setAttributeNS(null, 'className', `${classes} ${cssClass} __ROOT_CLASS__`)
    // we want data-variant="" all the time because of how css works
    root.setAttributeNS(null, '__ROOT_VARIANTS__', '')
  },

  injectComponentInstances (document, file, folder) {
    // @todo we can't use case sensitive queries; fix this after we get an answer on SO
    // Html.changeAllNodes('[className="component"]', document, node => {
    const container = file.isComponent ? document.body.children[0] : document.body
    Html.changeAllNodes('[data-ss-component]', container, node => {
      const component = this.getComponentNode(document, node, folder)
      node.replaceWith(component)
    })
  },

  getComponentNode (document, node, folder) {
    const data = ParseCommon.getComponentData(node)
    const cmpInstance = ParseCommon.getClassName(data.file, folder)
    const clone = document.createElementNS('https://www.w3.org/XML/1998/namespace', cmpInstance)
    this.setComponentProperties(clone, data)
    this.setComponentData(clone, data)
    Html.transferChildren(node, clone, document)
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
      const existingProps = ParseCommon.getProperties(node)
      this.injectIfForNode(node, existingProps, document)
      this.clearIfForProperties(node, existingProps)
    }
  },

  injectIfForNode (node, props, document) {
    if ('reactIf' in props) {
      ParseCommon.wrapNode(node, 'desechIf', document, { value: props.reactIf })
    } else if ('reactFor' in props) {
      ParseCommon.wrapNode(node, 'desechFor', document, { value: props.reactFor })
    } else if ('reactIfFor' in props) {
      ParseCommon.wrapNode(node, 'desechIfFor', document, { value: props.reactIfFor })
    } else if ('reactForIf' in props) {
      ParseCommon.wrapNode(node, 'desechForIf', document, { value: props.reactForIf })
    }
  },

  clearIfForProperties (node, existingProps) {
    const clearProps = ['reactIf', 'reactFor', 'reactIfFor', 'reactForIf']
    for (const name of clearProps) {
      if (name in existingProps) delete existingProps[name]
    }
    ParseCommon.setProperties(node, existingProps)
  },

  injectComponentHole (document) {
    for (const node of document.querySelectorAll('[data-ss-component-hole]')) {
      node.removeAttributeNS(null, 'data-ss-component-hole')
      node.innerHTML = '{this.props.children}'
    }
  },

  injectComponentOverrides (document, overrides) {
    // @todo we can't use case sensitive queries; fix this after we get an answer on SO
    // for (const node of document.querySelectorAll('[className*="e0"], [dRef]')) {
    for (const node of document.querySelectorAll('*')) {
      const ref = Html.getAnyRef(node)
      if (ref) {
        ParseOverride.injectOverrides(node, ref, overrides[ref], this._component, document)
      }
    }
  },

  // we need to add the ref to the properties to help our regex
  // if we try and get the ref from the className with regex, it complicates the regex a lot
  // with negative look aheads and it might still be buggy because property values can contain
  // all sort of text including the words `className` or <> or other special characters
  prepareProperties (document) {
    for (const node of document.querySelectorAll('[data-ss-properties]')) {
      const ref = Html.getAnyRef(node)
      const value = ref + '|' + node.getAttributeNS(null, 'data-ss-properties')
      node.setAttributeNS(null, 'data-ss-properties', value)
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
