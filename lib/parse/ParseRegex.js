const Html = require('../Html.js')
const ExtendJS = require('../ExtendJS.js')
const ParseOverride = require('./ParseOverride.js')

module.exports = {
  _splitProps: ' :: ',

  replaceTemplate (html) {
    return html.replaceAll('<template', '<templatex123abc')
      .replaceAll('</template>', '</templatex123abc>')
  },

  replaceTemplateBack (html) {
    return html.replaceAll('<templatex123abc', '<template')
      .replaceAll('</templatex123abc>', '</template>')
  },

  regexHtmlRender (isComponent, data, componentObj, document, lib) {
    let html = isComponent ? document.body.innerHTML : document.body.outerHTML
    html = this.replaceTemplateBack(html)
    html = ParseOverride.replaceOverrides(html, componentObj)
    html = html.replace(/<body([\s\S]*?)<\/body>/g, '<div$1</div>')
    html = html.replace(/<a(.*?)href="([^http].*?)"(.*?)>([\s\S]*?)<\/a>/,
      '<Link$1to="$2"$3>$4</Link>')
    html = html.replace(/<input(.*)value="(.*?)"(.*?)>/g, '<input$1defaultValue="$2"$3>')
    html = html.replace(/<(img|input|track|br)(.*?)>/g, '<$1$2 />')
    html = this.replaceCamelCaseAttributes(html)
    html = this.replaceShortAttributes(html)
    html = this.addElementClasses(html, data)
    html = this.addElementProperties(html, data)
    html = this.addComponentProperties(html, data)
    html = this.addRootElementData(html)
    html = this.addComponentData(html)
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
    const regex = / (hidden|disabled|readonly|required|multiple|controls|autoplay|loop|muted|default|reversed)=".*?"/g
    html = html.replace(regex, ' $1')
    return html
  },

  addElementClasses (html, data) {
    return html.replace(/className="(.*?)"/g, (match, classes) => {
      const stringClasses = classes.split(' ')
      const ref = Html.getRef(stringClasses)
      const codeClasses = ParseOverride.overrideClasses(ref, stringClasses,
        data.componentOverrides[ref])
      return this.buildClassesAttribute(stringClasses, codeClasses)
    })
  },

  buildClassesAttribute (stringClasses, codeClasses) {
    if (codeClasses) {
      return 'className={`' + [...stringClasses, ...codeClasses].join(' ') + '`}'
    } else {
      return `className="${stringClasses.join(' ')}"`
    }
  },

  addElementProperties (html, data) {
    // we can't add attributes with setAttributeNS because we allow invalid html/xml attributes
    const regex = /(className="([^><]*?)"[^><]*?) data-ss-properties="(.*?)"/g
    return html.replace(regex, (match, group, classes, json) => {
      const props = JSON.parse(json.replaceAll('&quot;', '"'))
      const ref = Html.getRef(classes.split(' '))
      const attrs = this.getPropertyAttributes(ref, props, data)
      return (group + ' ' + attrs).trim()
    })
  },

  getPropertyAttributes (ref, props, data) {
    const attrs = []
    for (const [name, value] of Object.entries(props)) {
      this.addProperty(ref, name, value, attrs, data)
    }
    // add the new properties to the list
    ParseOverride.overrideNewProperties(ref, props, data.componentOverrides[ref], attrs)
    return attrs.join(' ')
  },

  addProperty (ref, name, value, attrs, data) {
    const prop = this.getProperty(name, value)
    const override = ParseOverride.overrideExistingProperty(ref, prop.name, prop.value,
      data.componentOverrides[ref])
    attrs.push(override || Object.values(prop).join('='))
  },

  getProperty (name, value) {
    if (value.startsWith('{')) {
      return { name, value }
    } else {
      value = value.replaceAll('"', '&quot;')
      return { name, value: '"' + value + '"' }
    }
  },

  addComponentProperties (html, data) {
    // we can't add attributes with setAttributeNS because we allow invalid html/xml attributes
    const regex = /data-ss-properties="(.*?)" dRef="(e0[a-z0-9]+)"/g
    return html.replace(regex, (match, json, ref) => {
      const props = JSON.parse(json.replaceAll('&quot;', '"'))
      const attrs = this.getPropertyAttributes(ref, props, data)
      return (attrs + ` dRef="${ref}"`).trim()
    })
  },

  addRootElementData (html) {
    html = this.addRootElementClass(html)
    html = this.addRootElementVariants(html)
    return html
  },

  // we add the __ROOT_CLASS and then we process the class overrides
  addRootElementClass (html) {
    const regex = /className=("|{`)(.*?__ROOT_CLASS__.*?)("|`})/g
    return html.replace(regex, (match, q1, classString, q2) => {
      const classes = ExtendJS.splitByCharacter(classString, ' ', '{', '}')
      const list = this.getRootClassList(classes)
      return this.buildClassesAttribute(list.string, list.code)
    })
  },

  getRootClassList (classes) {
    const list = { string: [], code: [] }
    for (const cls of classes) {
      if (cls === '__ROOT_CLASS__') {
        list.code.push('${d.componentRef}') // eslint-disable-line
      } else if (cls.startsWith('${d.e0')) {
        list.code.push(cls)
      } else {
        list.string.push(cls)
      }
    }
    return list
  },

  addRootElementVariants (html, data) {
    return html.replace(/__ROOT_VARIANTS__=""/g, (match) => {
      return 'data-variant={d.componentVariants}'
    })
  },

  addComponentData (html) {
    return html.replace(/__COMPONENT_OVERRIDES__(e0[a-z0-9]+)=""/g, (match, ref) => {
      return 'dOverrides={d.' + ref + 'Overrides}'
    }).replace(/__COMPONENT_VARIANTS__(e0[a-z0-9]+)=""/g, (match, ref) => {
      return 'dVariants={d.' + ref + 'Variants}'
    })
  },

  replaceIfForCode (html) {
    html = this.replaceIfForCombo(html)
    html = this.replaceForIfCombo(html)
    html = this.replaceIfCondition(html)
    html = this.replaceForLoop(html)
    return html
  },

  replaceIfForCombo (html) {
    // `test === 1 :: props.posts :: post` becomes
    // `{test === 1 && props.posts.map(post => <li>...</li>)}`
    return html.replace(/<desechIfFor value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]} && ${data[1]}.map(${data[2]} => `
    }).replace(/<\/desechIfFor>/g, ')}')
  },

  replaceForIfCombo (html) {
    // `props.posts :: post :: post.id > 0` becomes
    // `{props.posts.map(post => post.id > 0 && <li>...</li>}`
    return html.replace(/<desechForIf value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]}.map(${data[1]} => ${data[2]} && `
    }).replace(/<\/desechForIf>/g, ')}')
  },

  replaceIfCondition (html) {
    // `unreadMessages.length > 0` becomes `{unreadMessages.length > 0 && <div>...</div>}`
    return html.replace(/<desechIf value="(.*?)">/g, '{$1 && ').replace(/<\/desechIf>/g, '}')
  },

  replaceForLoop (html) {
    // `props.posts :: post` becomes `{props.posts.map(post => <li>...</li>}`
    return html.replace(/<desechFor value="(.*?)">/g, (match, value) => {
      const data = value.split(this._splitProps)
      return `{${data[0]}.map(${data[1]} => `
    }).replace(/<\/desechFor>/g, ')}')
  }
}
