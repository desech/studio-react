const Html = require('../Html.js')
const ExtendJS = require('../ExtendJS.js')
const ParseOverride = require('./ParseOverride.js')
const ParseCommon = require('./ParseCommon.js')

module.exports = {
  // make sure to have very little regex code because of how complicated html parsing is
  regexHtmlRender (file, data, componentObj, document, lib) {
    let html = file.isComponent ? document.body.innerHTML : document.body.outerHTML
    html = ParseOverride.replaceOverrides(html, componentObj)
    // no global regex because we only need it once
    html = html.replace(/<body([\s\S]*?)<\/body>/, '<div$1</div>')
    html = html.replace(/<(img |input |track |hr |col |area |br)(.*?)>/g, '<$1$2 />')
    html = this.addRegularProperties(html)
    html = this.addAllClasses(html, data, componentObj)
    html = this.addRootElementData(html)
    html = this.addComponentData(html, data)
    html = this.replaceIfForCode(html)
    // needs to be last because it will break properties
    html = this.convertAttributesToCode(html)
    html = Html.beautifyHtml(html.replace(/\r?\n/g, '\n'), lib.beautify, 3)
    return '    const render = (\n' + html + '\n    )\n'
  },

  // overridden properties and reactIf/etc have been removed from here
  // we can't add attributes with setAttributeNS because we allow invalid html/xml attributes
  addRegularProperties (html) {
    return html.replace(/data-ss-properties="(.*?)"/g, (match, json) => {
      const props = JSON.parse(json.replaceAll('&quot;', '"'))
      return this.getPropertyAttributes(props)
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

  // this process regular, overridden and root classes
  addAllClasses (html, data, componentObj) {
    return html.replace(/className="(.*?)"/g, (match, string) => {
      const classes = string.split(' ')
      const ref = Html.getRef(classes)
      const codeClasses = ParseOverride.overrideClasses(ref, classes,
        data.component.overrides[ref], componentObj.defaults)
      return this.buildClassesAttribute(classes, codeClasses)
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

  // this happens after we have added the class overrides
  addRootElementClass (html) {
    const regex = /className=("|{`)(.*?desech-regex-root-class.*?)("|`})/g
    return html.replace(regex, (match, q1, classString, q2) => {
      const classes = ExtendJS.splitByCharacter(classString, ' ', '{', '}')
      const list = this.getRootClassList(classes)
      return this.buildClassesAttribute(list.string, list.code)
    })
  },

  getRootClassList (classes) {
    const list = { string: [], code: [] }
    for (const cls of classes) {
      if (cls === 'desech-regex-root-class') {
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
    return html.replace(/desech-regex-root-variants=""/g, (match) => {
      // we want data-variant="" all the time because of how css works
      return 'data-variant={d.componentVariants}'
    })
  },

  addComponentData (html, data) {
    html = html.replace(/desech-regex-component-overrides-(e0[a-z0-9]+)=""/g, (match, ref) => {
      return 'dOverrides={d.' + ref + 'Overrides}'
    })
    html = this.addComponentVariants(html, data.component.variants)
    return html
  },

  addComponentVariants (html, variants) {
    const regex = /desech-regex-component-variants-(e0[a-z0-9]+)="(.*?)"/g
    return html.replace(regex, (match, ref, file) => {
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
    // `test === 1 :: post in props.posts` becomes
    // `{test === 1 && props.posts.map(post => <li>...</li>)}`
    return html.replace(/<desechIfFor value="(.*?)">/g, (match, value) => {
      const data = value.split(' :: ')
      const combo = data[1].split(' in ')
      return `{${data[0]} && ${combo[1]}.map(${combo[0]} => `
    }).replace(/<\/desechIfFor>/g, ')}')
  },

  replaceForIfCombo (html) {
    // `post in props.posts :: post.id > 0` becomes
    // `{props.posts.map(post => post.id > 0 && <li>...</li>}`
    return html.replace(/<desechForIf value="(.*?)">/g, (match, value) => {
      const data = value.split(' :: ')
      const combo = data[0].split(' in ')
      return `{${combo[1]}.map(${combo[0]} => ${data[1]} && `
    }).replace(/<\/desechForIf>/g, ')}')
  },

  replaceIfCondition (html) {
    // `unreadMessages.length > 0` becomes `{unreadMessages.length > 0 && <div>...</div>}`
    return html.replace(/<desechIf value="(.*?)">/g, '{$1 && ').replace(/<\/desechIf>/g, '}')
  },

  replaceForLoop (html) {
    // `post in props.posts` becomes `{props.posts.map(post => <li>...</li>}`
    return html.replace(/<desechFor value="(.*?)">/g, (match, value) => {
      const data = value.split(' in ')
      return `{${data[1]}.map(${data[0]} => `
    }).replace(/<\/desechFor>/g, ')}')
  },

  // attribute values that are wrapped around curly brackets should have the quotes removed,
  // so they are seen by react as code, instead of string;
  // any quotes inside attribute quotes are escaped as &quot; so we are safe on this one, but
  // we are making a gamble here because this piece of matched regex can be part of some
  // random text inside an html element
  convertAttributesToCode (html) {
    return html.replace(/([a-zA-Z0-9-]+)="{(.*?)}"/g, '$1={$2}')
  }
}
