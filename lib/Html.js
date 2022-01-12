module.exports = {
  getRef (classList) {
    for (const name of classList) {
      if (name.startsWith('e0')) return name
    }
  },

  escapeQuotedHtml (html, quote = '`') {
    if (!html) return ''
    return html.replaceAll('\\', '\\\\').replaceAll(quote, '\\' + quote)
      .replace(/(\r\n|\n|\r)/gm, '').replace(/  +/g, ' ').trim()
  },

  changeTag (node, tag, document) {
    const clone = this.createElement(tag, document)
    for (const attr of node.attributes) {
      clone.setAttributeNS(null, attr.name, attr.value)
    }
    while (node.firstChild) {
      clone.appendChild(node.firstChild)
    }
    node.replaceWith(clone)
    return clone
  },

  createElement (tag, document) {
    if (tag === 'svg') {
      return document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    } else {
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
    }
  },

  getTag (node) {
    return node.tagName.toLowerCase()
  },

  beautifyHtml (body, beautify, level = 0) {
    if (!body) return ''
    return beautify.html(body, {
      indent_size: 2,
      preserve_newlines: false,
      indent_level: level
    })
  }
}
