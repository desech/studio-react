const Html = require('../Html.js')
const ExtendJS = require('../ExtendJS.js')
const ParseOverride = require('./ParseOverride.js')
const ParseCommon = require('./ParseCommon.js')

module.exports = {
  _splitProps: ' :: ',

  // make sure to have very little regex code because of how complicated html parsing is
  regexHtmlRender (file, data, componentObj, document, lib) {
    let html = file.isComponent ? document.body.innerHTML : document.body.outerHTML
    html = ParseOverride.replaceOverrides(html, componentObj)
    // no global regex because we only need it once
    html = html.replace(/<body([\s\S]*?)<\/body>/, '<div$1</div>')
    html = html.replace(/<(img |input |track |hr |col |area |br)(.*?)>/g, '<$1$2 />')
    html = this.addProperties(html, data, componentObj)
    html = this.addElementClasses(html, data, componentObj)
    html = this.addRootElementData(html)
    html = this.addComponentData(html, data)
    html = this.replaceIfForCode(html)
    html = Html.beautifyHtml(html.replace(/\r?\n/g, '\n'), lib.beautify, 3)
    return '    const render = (\n' + html + '\n    )\n'
  },

  // we can't add attributes with setAttributeNS because we allow invalid html/xml attributes
  addProperties (html, data, componentObj) {
    return html.replace(/data-ss-properties="(.*?)"/g, (match, value) => {
      const [ref, json] = value.split('|')
      const props = JSON.parse(json.replaceAll('&quot;', '"'))
      const attrs = this.getPropertyAttributes(ref, props, data, componentObj)
      return attrs
    })
  },

  getPropertyAttributes (ref, props, data, componentObj) {
    const attrs = []
    for (const [name, value] of Object.entries(props)) {
      this.addProperty(ref, name, value, attrs, data, componentObj)
    }
    // add the new properties to the list
    ParseOverride.overrideNewProperties(ref, props, data.component.overrides[ref], attrs)
    return attrs.join(' ')
  },

  addProperty (ref, name, value, attrs, data, componentObj) {
    // don't allow className as the property because it messes with overrides
    if (name === 'className') return
    const override = ParseOverride.overrideExistingProperty(ref, name, value,
      data.component.overrides[ref], componentObj.defaults)
    const prop = this.getProperty(name, value)
    attrs.push(override || Object.values(prop).join('='))
  },

  getProperty (name, value) {
    name = ParseCommon.filterAttribute(name)
    if (value.startsWith('{')) {
      return { name, value }
    } else {
      value = value.replaceAll('"', '&quot;')
      return { name, value: '"' + value + '"' }
    }
  },

  addElementClasses (html, data, componentObj) {
    return html.replace(/className="(.*?)"/g, (match, classes) => {
      const arrayClasses = classes.split(' ')
      const ref = Html.getRef(arrayClasses)
      const codeClasses = ParseOverride.overrideClasses(ref, arrayClasses,
        data.component.overrides[ref], componentObj.defaults)
      return this.buildClassesAttribute(arrayClasses, codeClasses)
    })
  },

  buildClassesAttribute (arrayClasses, codeClasses) {
    if (codeClasses) {
      return 'className={`' + [...arrayClasses, ...codeClasses].join(' ') + '`}'
    } else {
      return `className="${arrayClasses.join(' ')}"`
    }
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

  addRootElementVariants (html) {
    return html.replace(/__ROOT_VARIANTS__=""/g, (match) => {
      // we want data-variant="" all the time because of how css works
      return 'data-variant={d.componentVariants}'
    })
  },

  addComponentData (html, data) {
    html = html.replace(/__COMPONENT_OVERRIDES__(e0[a-z0-9]+)=""/g, (match, ref) => {
      return 'dOverrides={d.' + ref + 'Overrides}'
    })
    html = this.addComponentVariants(html, data.component.variants)
    return html
  },

  addComponentVariants (html, variants) {
    return html.replace(/__COMPONENT_VARIANTS__(e0[a-z0-9]+)="(.*?)"/g, (match, ref, file) => {
      return this.buildVariants(ref, variants[file])
    })
  },

  buildVariants (ref, variants) {
    if (!variants) return ''
    const list = []
    for (const name of variants) {
      const cls = ExtendJS.toPascalCase(name)
      const attr = `dVar${cls}={d.${ref}Var${cls}}`
      list.push(attr)
    }
    return list.join(' ')
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
