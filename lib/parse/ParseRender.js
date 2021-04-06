const ParseCommon = require('./ParseCommon.js')

module.exports = {
  _splitProps: ' :: ',

  getRenderBlock (dom) {
    const document = dom.window.document
    this.injectClassComponents(document, document)
    this.injectIfFor(document)
    const html = document.body.innerHTML
    return this.regexHtmlRender(html)
  },

  injectClassComponents (document, container) {
    for (const div of container.querySelectorAll('div.component')) {
      const tag = this.getComponentTag(document, div)
      div.replaceWith(tag)
      this.injectClassComponents(document, tag)
    }
  },

  getComponentTag (document, div) {
    const cls = ParseCommon.getClassName(div.getAttributeNS(null, 'src'))
    const tag = document.createElementNS('https://www.w3.org/XML/1998/namespace', cls)
    this.setElementProperties(div, tag)
    tag.innerHTML = div.innerHTML
    return tag
  },

  setElementProperties (old, newNode) {
    if (old.hasAttributeNS(null, 'data-element-properties')) {
      const props = old.getAttributeNS(null, 'data-element-properties')
      newNode.setAttributeNS(null, 'data-element-properties', props)
    }
  },

  injectIfFor (document) {
    for (const tag of document.querySelectorAll('[data-element-properties]')) {
      const props = this.getProperties(tag)
      if ('reactIf' in props) {
        this.injectIfForTag('if', document, tag, props.reactIf)
      } else if ('reactFor' in props) {
        this.injectIfForTag('for', document, tag, props.reactFor)
      } else if ('reactIfFor' in props) {
        this.injectIfForTag('iffor', document, tag, props.reactIfFor)
      } else if ('reactForIf' in props) {
        this.injectIfForTag('forif', document, tag, props.reactForIf)
      }
      this.clearnIfForProps(tag, props)
    }
  },

  getProperties (node) {
    const string = node.getAttributeNS(null, 'data-element-properties')
    return string ? JSON.parse(string) : {}
  },

  injectIfForTag (type, document, tag, value) {
    // wrap the tag with an <if></if>, <for></for>, <iffor></iffor> or <forif></forif>
    const wrapper = document.createElementNS('http://www.w3.org/1999/xhtml', type)
    wrapper.setAttributeNS(null, 'value', value)
    tag.parentNode.insertBefore(wrapper, tag)
    wrapper.appendChild(tag)
  },

  clearnIfForProps (tag, props) {
    for (const name of ['reactIf', 'reactFor', 'reactIfFor', 'reactForIf']) {
      if (name in props) delete props[name]
    }
    tag.setAttributeNS(null, 'data-element-properties', JSON.stringify(props))
  },

  regexHtmlRender (html) {
    html = html.replace(/<div class="component-children(.*?)><\/div>/g, '{this.props.children}')
    html = html.replace(/<a /g, '<Link ').replace(/ href="/g, ' to="')
      .replace(/<\/a>/g, '</Link>')
    html = html.replace(/<(img|input|track)(.*?)>/g, '<$1$2 />')
    html = this.replaceCamelCaseAttributes(html)
    html = this.replaceShortAttributes(html)
    html = this.addElementProperties(html)
    html = this.replaceIfForCode(html)
    html = '    const render = (\n      ' + html.replaceAll('\n', '\n      ') + '\n    )\n'
    return html
  },

  replaceCamelCaseAttributes (html) {
    const attrs = {
      class: 'className',
      srcset: 'srcSet',
      srclang: 'srcLang',
      autoplay: 'autoPlay',
      minlength: 'minLength',
      maxlength: 'maxLength',
      readonly: 'readOnly'
    }
    for (const [name, value] of Object.entries(attrs)) {
      const regex = new RegExp(` ${name}="(.*?)"`, 'g')
      html = html.replace(regex, ` ${value}="$1"`)
    }
    return html
  },

  replaceShortAttributes (html) {
    html = html.replace(/ (checked|selected)=""/g, '')
    html = html.replace(/ (hidden|disabled|readonly|required|multiple|controls|autoplay|loop|muted|default|reversed)=".*?"/g,
      ' $1')
    return html
  },

  addElementProperties (html) {
    // we can't add attributes with setAttributeNS because we allow invalid html/xml attributes
    return html.replace(/(className="([^><]*?)"([^><]*?))?data-element-properties="(.*?)"/g,
      (match, extraBlock, cls, extra, json) => {
        const props = JSON.parse(json.replaceAll('&quot;', '"'))
        const attrs = this.getPropertyAttributes(props, cls)
        return extraBlock ? (attrs + ' ' + extra).trim() : attrs
      }
    )
  },

  getPropertyAttributes (props, cls) {
    const attrs = []
    if (!props.className) attrs.push(`className="${cls}"`)
    for (let [name, value] of Object.entries(props)) {
      if (value.startsWith('{')) {
        attrs.push(`${name}=${value}`)
        continue
      }
      value = value.replaceAll('"', '&quot;')
      if (name === 'className') value = ((cls || '') + ' ' + value).trim()
      attrs.push(`${name}="${value}"`)
    }
    return attrs.join(' ')
  },

  replaceIfForCode (html) {
    html = this.replaceIfForCombo(html)
    html = this.replaceForIfCombo(html)
    html = this.replaceIfCondition(html)
    html = this.replaceForLoop(html)
    return html
  },

  replaceIfCondition (html) {
    // `unreadMessages.length > 0` becomes `{unreadMessages.length > 0 && <div>...</div>}`
    return html.replace(/<if value="(.*?)">/g, '{$1 && ').replace(/<\/if>/g, '}')
  },

  replaceForLoop (html) {
    // `props.posts :: post` becomes `{props.posts.map(post => <li>...</li>}`
    return html.replace(/<for value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]}.map(${data[1]} => `
    }).replace(/<\/for>/g, ')}')
  },

  replaceIfForCombo (html) {
    // `test === 1 :: props.posts :: post` becomes
    // `{test === 1 && props.posts.map(post => <li>...</li>)}`
    return html.replace(/<iffor value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]} && ${data[1]}.map(${data[2]} => `
    }).replace(/<\/iffor>/g, ')}')
  },

  replaceForIfCombo (html) {
    // `props.posts :: post :: post.id > 0` becomes
    // `{props.posts.map(post => post.id > 0 && <li>...</li>}`
    return html.replace(/<forif value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]}.map(${data[1]} => ${data[2]} && `
    }).replace(/<\/forif>/g, ')}')
  }
}
