const Html = require('../Html.js')
const ExtendJS = require('../ExtendJS.js')
const ParseCommon = require('./ParseCommon.js')

module.exports = {
  // data = { regex: {}, defaults: {} }
  injectOverrides (node, ref, overrides, data, document) {
    // attributes before the rest
    this.injectAttributes(node, ref, overrides, data)
    node = this.injectTag(node, ref, overrides, data, document)
    node = this.injectComponent(node, ref, overrides, data, document)
    this.injectInner(node, ref, overrides, data)
    this.injectUnrender(node, ref, overrides, data, document)
  },

  injectAttributes (node, ref, overrides, data) {
    if (!overrides?.attributes) return
    for (const name of Object.keys(overrides.attributes)) {
      this.injectAttribute(node, ref, name, data)
    }
  },

  // name is already in the `readOnly` format
  injectAttribute (node, ref, name, data) {
    this.setAttributeRegex(node, ref, name, data.regex)
    const value = this.getAttributeValue(node, name)
    const exists = this.attributeExists(node, name)
    if (exists) this.setAttributeDefault(ref, name, value, data.defaults)
    this.removeAttribute(node, name)
    // we will replace this value later with regex
    node.setAttributeNS(null, `__OVERRIDE_ATTR__${ref}__${name}`, '')
  },

  setAttributeRegex (node, ref, name, regex) {
    if (!regex[ref]) regex[ref] = {}
    if (!regex[ref].attributes) regex[ref].attributes = {}
    regex[ref].attributes[name] = this.getAttributeCode(ref, name)
  },

  getAttributeCode (ref, name, filter = false) {
    const index = this.getIndex(ref, 'Attr', name)
    if (filter) name = ParseCommon.filterAttribute(name)
    return name + `={d.${index}}`
  },

  getIndex (ref, type, name) {
    const label = ExtendJS.toPascalCase(name)
    return ref + type + label
  },

  getAttributeValue (node, name) {
    const map = ExtendJS.objectFlip(ParseCommon.getCamelCaseAttributeMap())
    if (name in map && node.hasAttributeNS(null, map[name])) {
      return node.getAttributeNS(null, map[name])
    } else {
      return node.getAttributeNS(null, name)
    }
  },

  // we need to revert the attribute from `defaultChecked` to `checked`
  attributeExists (node, name) {
    const map = ExtendJS.objectFlip(ParseCommon.getCamelCaseAttributeMap())
    return node.hasAttributeNS(null, name) ||
      (name in map && node.hasAttributeNS(null, map[name]))
  },

  setAttributeDefault (ref, name, value, defaults) {
    if (!defaults[ref]) defaults[ref] = {}
    if (!defaults[ref].attributes) defaults[ref].attributes = {}
    value = ParseCommon.getAttributeValue(name, value)
    defaults[ref].attributes[name] = { value: Html.escapeQuotedHtml(value, '"') }
  },

  removeAttribute (node, name) {
    node.removeAttributeNS(null, name)
    const map = ExtendJS.objectFlip(ParseCommon.getCamelCaseAttributeMap())
    if (name in map) node.removeAttributeNS(null, map[name])
  },

  injectTag (node, ref, overrides, data, document) {
    if (!overrides?.tag) return node
    if (!data.defaults[ref]) data.defaults[ref] = {}
    data.defaults[ref].tag = Html.getTag(node)
    // we will replace this value later with regex
    return Html.changeTag(node, `d.${ref}Tag`, document)
  },

  // swapping components with other components
  injectComponent (node, ref, overrides, data, document) {
    if (!overrides?.component) return node
    if (!data.defaults[ref]) data.defaults[ref] = {}
    data.defaults[ref].component = node.tagName
    // we will replace this value later with regex
    return Html.changeTag(node, `d.${ref}Component`, document)
  },

  injectInner (node, ref, overrides, data) {
    if (!overrides?.inner) return
    if (!data.defaults[ref]) data.defaults[ref] = {}
    data.defaults[ref].inner = Html.escapeQuotedHtml(node.innerHTML)
    node.innerHTML = ''
    if (!data.regex[ref]) data.regex[ref] = {}
    data.regex[ref].inner = `{{__html: d.${ref}Inner}}`
    // we will replace this value later with regex
    node.setAttributeNS(null, 'dangerouslySetInnerHTML', '__OVERRIDE_INNER__' + ref)
  },

  // this deals with overrides, but also with default unrender attributes
  injectUnrender (node, ref, overrides, data, document) {
    this.setUnrenderDefaults(node, ref, data.defaults)
    this.setUnrenderOverride(node, ref, overrides, data, document)
  },

  setUnrenderDefaults (node, ref, defaults) {
    if (!node.hasAttributeNS(null, 'data-ss-unrender')) return
    node.removeAttributeNS(null, 'data-ss-unrender')
    if (!defaults[ref]) defaults[ref] = {}
    if (!defaults[ref].attributes) defaults[ref].attributes = {}
    defaults[ref].attributes['data-ss-unrender'] = { value: '' }
  },

  setUnrenderOverride (node, ref, overrides, data, document) {
    if (!overrides?.unrender) return
    this.setUnrenderRegex(node, ref, data)
    // we will replace this value later with regex
    ParseCommon.wrapNode(node, '__OVERRIDE_UNRENDER__' + ref, document)
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
    const codeTags = this.getCodeTags().map(value => value.toLowerCase())
    const tag = Html.getTag(node)
    return codeTags.includes(tag)
  },

  getCodeTags () {
    return ['desechIf', 'desechFor', 'desechIfFor', 'desechForIf']
  },

  replaceOverrides (html, data) {
    html = this.replaceOverridesAttributes(html, data)
    html = this.replaceOverridesInner(html, data)
    html = this.replaceOverridesUnrender(html, data)
    return html
  },

  replaceOverridesAttributes (html, data) {
    return html.replace(/__OVERRIDE_ATTR__(e0[a-z0-9]+)__(.*?)=""/g, (match, ref, name) => {
      return data.regex[ref].attributes[name]
    })
  },

  replaceOverridesInner (html, data) {
    return html.replace(/(dangerouslySetInnerHTML)="__OVERRIDE_INNER__(e0[a-z0-9]+)"/g,
      (match, attr, ref) => `${attr}=${data.regex[ref].inner}`)
  },

  replaceOverridesUnrender (html, data) {
    return html.replace(/<__OVERRIDE_UNRENDER__(e0[a-z0-9]+)>/g, (match, ref) => {
      return data.regex[ref].unrender.start
    }).replace(/<\/__OVERRIDE_UNRENDER__(e0[a-z0-9]+)>/g, (match, ref) => {
      return data.regex[ref].unrender.end
    })
  },

  // this one is done during the html regex replace
  overrideExistingProperty (ref, name, value, overrides, defaults) {
    if (!overrides?.properties || !overrides.properties[name]) return
    this.setAttributeDefault(ref, name, value, defaults)
    return this.getAttributeCode(ref, name, true)
  },

  overrideNewProperties (ref, existingProps, overrides, attrs) {
    if (!overrides?.properties) return
    for (const name of Object.keys(overrides.properties)) {
      if (name in existingProps) continue
      const code = this.getAttributeCode(ref, name, true)
      attrs.push(code)
    }
  },

  overrideClasses (ref, stringClasses, overrides, defaults) {
    if (!overrides?.classes) return
    const codeClasses = []
    for (const [name, action] of Object.entries(overrides.classes)) {
      this.setClassDefault(ref, name, action, defaults)
      const code = this.getOverrideClassCode(ref, name)
      codeClasses.push(code)
      ExtendJS.removeFromArray(stringClasses, name)
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
