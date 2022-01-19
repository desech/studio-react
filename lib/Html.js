module.exports = {
  getAnyRef (node) {
    if (node.hasAttributeNS(null, 'className')) {
      return this.getRefByNode(node)
    } else if (node.hasAttributeNS(null, 'dRef')) {
      return node.getAttributeNS(null, 'dRef')
    }
  },

  getRefByNode (node) {
    const classes = node.getAttributeNS(null, 'className')
    return this.getRef(classes.split(' '))
  },

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

  // you can't just for loop through it because we replace nodes
  changeAllNodes (query, container, callback) {
    let node
    while (node = container.querySelector(query)) { // eslint-disable-line
      callback(node)
    }
  },

  changeTag (node, tag, document) {
    const clone = this.createElement(tag, document)
    for (const attr of node.attributes) {
      clone.setAttributeNS(null, attr.name, attr.value)
    }
    this.transferChildren(node, clone, document)
    node.replaceWith(clone)
    return clone
  },

  transferChildren (from, to, document) {
    // JSDOM's inneHTML is bad because:
    //    - it changes case sensitive tags
    //    - doesn't handle self closing tags correctly
    // JSDOM's while loop appendChild is bad because:
    //    - it doesn't extract the insides of <template>
    // to.innerHTML = from.innerHTML
    const baseFrom = (this.getTag(from) === 'template')
      ? document.importNode(from.content, true)
      : from
    const baseTo = (this.getTag(to) === 'template') ? to.content : to
    while (baseFrom.firstChild) {
      baseTo.appendChild(baseFrom.firstChild)
    }
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

  getAttributes (node) {
    const result = {}
    for (const attr of node.attributes) {
      result[attr.name] = attr.value
    }
    return result
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
