const Html = require('../Html.js')

module.exports = {
  injectOverride (node, ref, overrides, data, document) {
    node = this.injectTag(node, ref, overrides, data, document)
    this.injectInner(node, ref, overrides, data)
    this.injectUnrender(node, ref, overrides, data)
    this.injectAttributes(node, ref, overrides, data)
    this.injectClasses(node, ref, overrides, data)
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

  injectUnrender (node, ref, overrides, data) {

  },

  injectAttributes (node, ref, overrides, data) {

  },

  injectClasses (node, ref, overrides, data) {

  },

  replaceOverrides (html, data) {
    html = html.replace(/__OVERRIDE_TAG__(e0[a-z0-9]+)/g, (match, ref) => data.regex[ref].tag)
    html = html.replace(/(dangerouslySetInnerHTML)="__OVERRIDE_INNER__(e0[a-z0-9]+)"/g,
      (match, attr, ref) => `${attr}=${data.regex[ref].inner}`)
    return html
  }
}
