const Html = require('../Html.js')
const ExtendJS = require('../ExtendJS.js')
const ParseCommon = require('./ParseCommon.js')

module.exports = {
  // data = { regex: {}, defaults: {} }
  injectOverrides (node, ref, overrides, data, document) {
    this.injectInner(node, ref, overrides, data)
    this.injectAttributes(node, ref, overrides, data)
    this.injectProperties(node, ref, overrides, data)
    this.injectUnrender(node, ref, overrides, data, document)
    this.injectTag(node, ref, overrides, data, document)
    this.injectComponent(node, ref, overrides, data, document)
  },

  injectInner (node, ref, overrides, data) {
    if (!overrides || !('inner' in overrides)) return
    if (!data.defaults[ref]) data.defaults[ref] = {}
    data.defaults[ref].inner = Html.escapeQuotedHtml(node.innerHTML)
    node.innerHTML = ''
    if (!data.regex[ref]) data.regex[ref] = {}
    data.regex[ref].inner = `{{__html: d.${ref}Inner}}`
    node.setAttributeNS(null, 'dangerouslySetInnerHTML', '__OVERRIDE_INNER__' + ref)
  },

  injectAttributes (node, ref, overrides, data) {
    if (!overrides?.attributes) return
    for (const name of Object.keys(overrides.attributes)) {
      this.injectAttribute(node, ref, name, data)
    }
  },

  injectAttribute (node, ref, name, data) {
    this.setAttributeRegex(node, ref, name, data.regex)
    node.setAttributeNS(null, `desech-regex-override-attr-${ref}-${name}`, '')
    if (node.hasAttributeNS(null, name)) {
      const value = node.getAttributeNS(null, name)
      this.setAttributeDefault(ref, name, value, data.defaults)
      node.removeAttributeNS(null, name)
    }
  },

  setAttributeRegex (node, ref, name, regex) {
    if (!regex[ref]) regex[ref] = {}
    if (!regex[ref].attributes) regex[ref].attributes = {}
    const index = this.getIndex(ref, 'Attr', name)
    regex[ref].attributes[name] = name + `={d.${index}}`
  },

  getIndex (ref, type, name) {
    const label = ExtendJS.toPascalCase(name)
    return ref + type + label
  },

  setAttributeDefault (ref, name, value, defaults) {
    if (!defaults[ref]) defaults[ref] = {}
    if (!defaults[ref].attributes) defaults[ref].attributes = {}
    value = ParseCommon.getAttributeValue(name, value)
    defaults[ref].attributes[name] = { value: Html.escapeQuotedHtml(value, '"') }
  },

  injectProperties (node, ref, overrides, data) {
    if (!overrides?.properties) return
    const existingProps = ParseCommon.getProperties(node)
    for (const name of Object.keys(overrides.properties)) {
      this.injectProperty(node, ref, name, data, existingProps)
    }
    ParseCommon.setProperties(node, existingProps)
  },

  // we use the same regex from attributes to set the final property values
  injectProperty (node, ref, name, data, existingProps) {
    const filteredName = ParseCommon.filterProperty(name)
    this.setAttributeRegex(node, ref, filteredName, data.regex)
    node.setAttributeNS(null, `desech-regex-override-attr-${ref}-${filteredName}`, '')
    if (name in existingProps) {
      this.setPropertyDefault(ref, name, existingProps[name], data.defaults)
      delete existingProps[name]
    }
  },

  setPropertyDefault (ref, name, value, defaults) {
    if (!defaults[ref]) defaults[ref] = {}
    if (!defaults[ref].properties) defaults[ref].properties = {}
    defaults[ref].properties[name] = { value: Html.escapeQuotedHtml(value, '"') }
  },

  // overrides built by ExportData.getAllComponentData() don't have `data-ss-unrender`
  // instead they have the `unrender` property
  // this deals with overrides, but also with default unrender attributes
  injectUnrender (node, ref, overrides, data, document) {
    const exists = this.setUnrenderDefaults(node, ref, data.defaults)
    this.setUnrenderOverride(node, ref, overrides, exists, data, document)
  },

  setUnrenderDefaults (node, ref, defaults) {
    if (!node.hasAttributeNS(null, 'data-ss-unrender')) return false
    node.removeAttributeNS(null, 'data-ss-unrender')
    if (!defaults[ref]) defaults[ref] = {}
    if (!defaults[ref].attributes) defaults[ref].attributes = {}
    defaults[ref].attributes['data-ss-unrender'] = { value: '' }
    return true
  },

  // the default unrender can't exist without the override logic
  setUnrenderOverride (node, ref, overrides, exists, data, document) {
    if (!exists && !overrides?.unrender) return
    this.setUnrenderRegex(node, ref, data)
    Html.wrapNode(node, 'desech-regex-override-unrender-' + ref, document)
  },

  setUnrenderRegex (node, ref, data) {
    if (!data.regex[ref]) data.regex[ref] = {}
    // if we have code blocks like reactIf, etc, then we need to forget about the wrapping `{}`
    if (this.hasCodeTags(node.parentNode)) {
      data.regex[ref].unrender = {
        start: `!d.${ref}Unrender && `,
        end: ''
      }
    } else {
      data.regex[ref].unrender = {
        start: `{!d.${ref}Unrender && `,
        end: '}'
      }
    }
  },

  hasCodeTags (node) {
    const ifFor = ['desechIf', 'desechFor', 'desechIfFor', 'desechForIf']
    const codeTags = ifFor.map(value => value.toLowerCase())
    const tag = Html.getTag(node)
    return codeTags.includes(tag)
  },

  injectTag (node, ref, overrides, data, document) {
    if (!overrides?.tag) return node
    if (!data.defaults[ref]) data.defaults[ref] = {}
    data.defaults[ref].tag = this.getTag(node)
    return Html.changeTag(node, `d.${ref}Tag`, document)
  },

  // we still have the template tags changed to template-desech, so revert it here
  getTag (node) {
    const tag = Html.getTag(node)
    return tag.replace('template-desech', 'template')
  },

  // swapping components with other components
  injectComponent (node, ref, overrides, data, document) {
    if (!overrides?.component) return node
    if (!data.defaults[ref]) data.defaults[ref] = {}
    data.defaults[ref].component = node.tagName
    return Html.changeTag(node, `d.${ref}Component`, document)
  },

  replaceOverrides (html, data) {
    html = this.replaceOverridesAttributesProperties(html, data)
    html = this.replaceOverridesInner(html, data)
    html = this.replaceOverridesUnrender(html, data)
    return html
  },

  replaceOverridesAttributesProperties (html, data) {
    const regex = /desech-regex-override-attr-(e0[a-z0-9]+)-(.*?)=""/g
    return html.replace(regex, (match, ref, name) => {
      return data.regex[ref].attributes[name]
    })
  },

  replaceOverridesInner (html, data) {
    return html.replace(/(dangerouslySetInnerHTML)="__OVERRIDE_INNER__(e0[a-z0-9]+)"/g,
      (match, attr, ref) => `${attr}=${data.regex[ref].inner}`)
  },

  replaceOverridesUnrender (html, data) {
    return html.replace(/<desech-regex-override-unrender-(e0[a-z0-9]+)>/g, (match, ref) => {
      return data.regex[ref].unrender.start
    }).replace(/<\/desech-regex-override-unrender-(e0[a-z0-9]+)>/g, (match, ref) => {
      return data.regex[ref].unrender.end
    })
  },

  overrideClasses (ref, regularClasses, overrides, defaults) {
    if (!overrides?.classes) return
    const codeClasses = []
    for (const [name, action] of Object.entries(overrides.classes)) {
      this.setClassDefault(ref, name, action, defaults)
      const code = this.getOverrideClassCode(ref, name)
      codeClasses.push(code)
      ExtendJS.removeFromArray(regularClasses, name)
    }
    return codeClasses
  },

  setClassDefault (ref, name, action, defaults) {
    if (action === 'create') return
    if (!defaults[ref]) defaults[ref] = {}
    if (!defaults[ref].classes) defaults[ref].classes = {}
    defaults[ref].classes[name] = { add: true }
  },

  getOverrideClassCode (ref, name) {
    const index = this.getIndex(ref, 'Cls', name)
    return '${d.' + index + '}'
  }
}
