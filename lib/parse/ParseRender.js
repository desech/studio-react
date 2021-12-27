const Html = require('../Html.js')
const ParseCommon = require('./ParseCommon.js')

module.exports = {
  _splitProps: ' :: ',

  getRenderBlock (body, css, fileType, lib) {
    const initialHtml = this.replaceTemplate(body)
    const document = (new lib.jsdom.JSDOM(initialHtml)).window.document
    this.injectClassComponents(document, document)
    this.injectIfFor(document)
    this.injectComponentHole(document)
    this.cleanClasses(document, css)
    const html = (fileType === 'page') ? document.body.outerHTML : document.body.innerHTML
    return this.regexHtmlRender(html, lib)
  },

  replaceTemplate (html) {
    return html.replaceAll('<template', '<templatex123abc')
      .replaceAll('</template>', '</templatex123abc>')
  },

  replaceTemplateBack (html) {
    return html.replaceAll('<templatex123abc', '<template')
      .replaceAll('</templatex123abc>', '</template>')
  },

  injectClassComponents (document, container) {
    for (const div of container.querySelectorAll('div.component')) {
      const component = this.getComponentNode(document, div)
      div.replaceWith(component)
      this.injectClassComponents(document, component)
    }
  },

  getComponentNode (document, div) {
    const data = ParseCommon.getComponentData(div)
    const cmpClass = ParseCommon.getClassName(data.file)
    const node = document.createElementNS('https://www.w3.org/XML/1998/namespace', cmpClass)
    this.setComponentProperties(node, data)
    node.innerHTML = div.innerHTML
    return node
  },

  setComponentProperties (cmpNode, data) {
    if (data.properties) {
      cmpNode.setAttributeNS(null, 'data-ss-properties', JSON.stringify(data.properties))
    }
  },

  injectIfFor (document) {
    for (const node of document.querySelectorAll('[data-ss-properties]')) {
      const props = this.getProperties(node)
      if ('reactIf' in props) {
        this.injectIfForTag('if', document, node, props.reactIf)
      } else if ('reactFor' in props) {
        this.injectIfForTag('for', document, node, props.reactFor)
      } else if ('reactIfFor' in props) {
        this.injectIfForTag('iffor', document, node, props.reactIfFor)
      } else if ('reactForIf' in props) {
        this.injectIfForTag('forif', document, node, props.reactForIf)
      }
      this.clearnIfForProps(node, props)
    }
  },

  getProperties (node) {
    const string = node.getAttributeNS(null, 'data-ss-properties')
    return string ? JSON.parse(string) : {}
  },

  injectIfForTag (type, document, node, value) {
    // wrap the tag with an <if></if>, <for></for>, <iffor></iffor> or <forif></forif>
    const wrapper = document.createElementNS('http://www.w3.org/1999/xhtml', type)
    wrapper.setAttributeNS(null, 'value', value)
    node.parentNode.insertBefore(wrapper, node)
    wrapper.appendChild(node)
  },

  clearnIfForProps (node, props) {
    for (const name of ['reactIf', 'reactFor', 'reactIfFor', 'reactForIf']) {
      if (name in props) delete props[name]
    }
    node.setAttributeNS(null, 'data-ss-properties', JSON.stringify(props))
  },

  injectComponentHole (document) {
    for (const node of document.querySelectorAll('[data-ss-component-hole]')) {
      node.removeAttributeNS(null, 'data-ss-component-hole')
      node.innerHTML = '{this.props.children}'
    }
  },

  cleanClasses (document, css) {
    // getElementsByClassName doesn't work correctly with jsdom
    for (const node of document.querySelectorAll('[class*="e0"]')) {
      if (node.classList.contains('text')) {
        node.classList.remove('text')
      }
      if (!node.getAttributeNS(null, 'class')) {
        node.removeAttributeNS(null, 'class')
      }
    }
  },

  regexHtmlRender (html, lib) {
    html = this.replaceTemplateBack(html)
    html = html.replace(/<body([\s\S]*?)<\/body>/g, '<div$1</div>')
    html = html.replace(/<a(.*?)href="([^http].*?)"(.*?)>([\s\S]*?)<\/a>/,
      '<Link$1to="$2"$3>$4</Link>')
    html = html.replace(/<input(.*)value="(.*?)"(.*?)>/g, '<input$1defaultValue="$2"$3>')
    html = html.replace(/<(img|input|track|br)(.*?)>/g, '<$1$2 />')
    html = this.replaceCamelCaseAttributes(html)
    html = this.replaceShortAttributes(html)
    html = this.addElementProperties(html)
    html = this.replaceIfForCode(html)
    html = Html.beautifyHtml(html.replace(/\r?\n/g, '\n'), lib.beautify, 3)
    return '    const render = (\n' + html + '\n    )\n'
  },

  replaceCamelCaseAttributes (html) {
    const attrs = {
      class: 'className',
      srcset: 'srcSet',
      srclang: 'srcLang',
      autoplay: 'autoPlay',
      minlength: 'minLength',
      maxlength: 'maxLength',
      readonly: 'readOnly',
      autocomplete: 'autoComplete',
      for: 'htmlFor'
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
    return html.replace(/(className="([^><]*?)"([^><]*?))?data-ss-properties="(.*?)"/g,
      (match, extraBlock, cls, extra, json) => {
        const props = JSON.parse(json.replaceAll('&quot;', '"'))
        const attrs = this.getPropertyAttributes(props, cls || '')
        return extraBlock ? (attrs + ' ' + extra).trim() : attrs
      }
    )
  },

  getPropertyAttributes (props, cls) {
    const attrs = []
    if (!props.className && cls) attrs.push(`className="${cls}"`)
    for (let [name, value] of Object.entries(props)) {
      if (value.startsWith('{')) {
        attrs.push(`${name}=${value}`)
        continue
      }
      value = value.replaceAll('"', '&quot;')
      if (name === 'className') value = (cls + ' ' + value).trim()
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
