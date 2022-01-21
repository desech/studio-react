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
    html = this.convertAttributesToCode(html)
    html = this.addProperties(html)
    html = this.addElementClasses(html, data, componentObj)
    html = this.addRootElementData(html)
    html = this.addComponentData(html, data)
    html = this.replaceIfForCode(html)
    html = Html.beautifyHtml(html.replace(/\r?\n/g, '\n'), lib.beautify, 3)
    return '    const render = (\n' + html + '\n    )\n'
  },

  // attribute values that are wrapped around curly brackets should have the quotes removed,
  // so they are seen by react as code, instead of string;
  // any quotes inside attribute quotes are escaped as &quot; so we are safe on this one, but
  // we are making a gamble here because this piece of matched regex can be part of some
  // random text inside an html element
  convertAttributesToCode (html) {
    return html.replace(/([a-zA-Z0-9-]+)="{(.*?)}"/g, '$1={$2}')
  },

  // overridden properties and reactIf/etc have been removed from here
  // we can't add attributes with setAttributeNS because we allow invalid html/xml attributes
  addProperties (html) {
    return html.replace(/data-ss-properties="(.*?)"/g, (match, json) => {
      const props = JSON.parse(json.replaceAll('&quot;', '"'))
      const attrs = this.getPropertyAttributes(props)
      return attrs
    })
  },

  getPropertyAttributes (props) {
    const attrs = []
    for (const [name, value] of Object.entries(props)) {
      this.addProperty(name, value, attrs)
    }
    return attrs.join(' ')
  },

  addProperty (name, value, attrs) {
    // don't allow className as the property because it messes with overrides
    name = ParseCommon.filterProperty(name)
    if (name === 'class' || name === 'className') return
    const prop = this.getProperty(name, value)
    attrs.push(Object.values(prop).join('='))
  },

  getProperty (name, value) {
    if (value.startsWith('{')) {
      return { name, value }
    } else {
      value = value.replaceAll('"', '&quot;')
      return { name, value: '"' + value + '"' }
    }
  },

  addElementClasses (html, data, componentObj) {
    return html.replace(/className="(.*?)"/g, (match, classes) => {
      const stringClasses = classes.split(' ')
      const ref = Html.getRef(stringClasses)
      const codeClasses = ParseOverride.overrideClasses(ref, stringClasses,
        data.component.overrides[ref], componentObj.defaults)
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

  addRootElementData (html) {
    html = this.addRootElementClass(html)
    html = this.addRootElementVariants(html)
    return html
  },

  // this happens after we have added the class overrides
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
