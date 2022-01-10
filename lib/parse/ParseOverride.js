const Html = require('../Html.js')
const ExtendJS = require('../ExtendJS.js')
const ParseCommon = require('./ParseCommon.js')

module.exports = {
  injectOverrides (node, ref, overrides, data, document) {
    // attributes before the rest
    this.injectAttributes(node, ref, overrides, data)
    node = this.injectTag(node, ref, overrides, data, document)
    this.injectInner(node, ref, overrides, data)
    this.injectUnrender(node, ref, overrides, data, document)
  },

  injectAttributes (node, ref, overrides, data) {
    if (!overrides?.attributes) return
    for (const [name, type] of Object.entries(overrides.attributes)) {
      this.injectAttribute(node, ref, name, type, data)
    }
  },

  injectAttribute (node, ref, name, type, data) {
    this.setAttributeRegex(node, ref, name, type, data.regex)
    node.removeAttributeNS(null, name)
    // we will replace this value later with regex
    node.setAttributeNS(null, `__OVERRIDE_ATTR__${ref}__${name}`, '')
  },

  setAttributeRegex (node, ref, name, type, regex) {
    if (!regex[ref]) regex[ref] = {}
    if (!regex[ref].attributes) regex[ref].attributes = {}
    const exists = node.hasAttributeNS(null, name)
    const value = node.getAttributeNS(null, name)
    regex[ref].attributes[name] = this.getAttributeCode(ref, name, value, type, exists)
  },

  getAttributeCode (ref, name, value, type, exists, filter = false) {
    const i = this.getIndexes(ref, name, 'Attr')
    if (filter) name = name.replace(/[^a-zA-Z0-9-_]/g, '')
    value = Html.escapeQuotedHtml(value, "'")
    if (type === 'update' && !exists) {
      return '{...DS.e(d.' + i.default + ') && {\'' + name + '\':d.' + i.default + '}}'
    } else if (type === 'update') {
      return name + '={DS.e(d.' + i.default + ') ? d.' + i.default + ' : \'' + value + '\'}'
    } else if (type === 'delete') {
      return '{...!d.' + i.delete + ' && {\'' + name + '\':\'' + value + '\'}}'
    } else if (type === 'update-delete') {
      return '{...!d.' + i.delete + ' && {\'' + name + '\': DS.e(d.' + i.default +
        ') ? d.' + i.default + ' : \'' + value + '\'}}'
    }
  },

  getIndexes (ref, name, type) {
    const label = ExtendJS.toPascalCase(name)
    return {
      default: ref + type + label,
      delete: ref + type + 'del' + label
    }
  },

  injectTag (node, ref, overrides, data, document) {
    if (!overrides?.tag) return node
    if (!data.regex[ref]) data.regex[ref] = {}
    if (!data.defaults[ref]) data.defaults[ref] = {}
    data.regex[ref].tag = `d.${ref}Tag`
    data.defaults[ref].tag = Html.getTag(node)
    // we will replace this value later with regex
    return Html.changeTag(node, '__OVERRIDE_TAG__' + ref, document)
  },

  injectInner (node, ref, overrides, data) {
    if (!overrides?.inner) return
    if (!data.regex[ref]) data.regex[ref] = {}
    const defaultValue = Html.escapeQuotedHtml(node.innerHTML)
    node.innerHTML = ''
    data.regex[ref].inner = `{{__html: DS.e(d.${ref}Inner) ? d.${ref}Inner : \`${defaultValue}\`}}`
    // we will replace this value later with regex
    node.setAttributeNS(null, 'dangerouslySetInnerHTML', '__OVERRIDE_INNER__' + ref)
  },

  injectUnrender (node, ref, overrides, data, document) {
    // this deals with overrides, but also with default unrender attributes
    if (!overrides?.unrender && !node.hasAttributeNS(null, 'data-ss-unrender')) return
    if (node.hasAttributeNS(null, 'data-ss-unrender')) {
      node.removeAttributeNS(null, 'data-ss-unrender')
      if (!data.defaults[ref]) data.defaults[ref] = {}
      data.defaults[ref].unrender = true
    }
    // we will replace this value later with regex
    ParseCommon.wrapNode(node, '__OVERRIDE_UNRENDER__' + ref, document)
  },

  replaceOverrides (html, data) {
    html = this.replaceOverridesAttributes(html, data)
    html = html.replace(/__OVERRIDE_TAG__(e0[a-z0-9]+)/g, (match, ref) => data.regex[ref].tag)
    html = this.replaceOverridesInner(html, data)
    html = this.replaceOverridesUnrender(html)
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

  replaceOverridesUnrender (html) {
    return html.replace(/<__OVERRIDE_UNRENDER__(e0[a-z0-9]+)>/g, (match, ref) => {
      return `{!DS.e(d.${ref}Unrender) && `
    }).replace(/<\/__OVERRIDE_UNRENDER__(e0[a-z0-9]+)>/g, '}')
  },

  // this one is done during the html regex replace
  overrideExistingProperty (ref, name, value, overrides) {
    if (!overrides?.properties || !overrides.properties[name]) return
    return this.getAttributeCode(ref, name, value, overrides.properties[name], true, true)
  },

  overrideNewProperties (ref, existingProps, overrides, attrs) {
    if (!overrides?.properties) return
    for (const [name, type] of Object.entries(overrides.properties)) {
      if (name in existingProps) continue
      const code = this.getAttributeCode(ref, name, existingProps[name], type, false, true)
      attrs.push(code)
    }
  },

  overrideClasses (ref, stringClasses, overrides) {
    if (!overrides?.classes) return
    const codeClasses = []
    for (const [name, action] of Object.entries(overrides.classes)) {
      const code = this.getOverrideClassCode(ref, name, action)
      codeClasses.push(code)
      ExtendJS.removeFromArray(stringClasses, name)
    }
    return codeClasses
  },

  getOverrideClassCode (ref, name, action) {
    const i = this.getIndexes(ref, name, 'Cls')
    return (action === 'create')
      ? '${d.' + i.default + ' || \'\'}'
      : '${d.' + i.delete + ' ? \'\' : \'' + name + '\'}'
  }
}
