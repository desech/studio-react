const ExtendJS = require('../ExtendJS.js')
const File = require('../File.js')

module.exports = {
  // /path/user/register.html => page/user/UserRegister.js
  // /path/component/header/nav.html => component/header/HeaderNav.js
  // component/header/nav.html => component/header/HeaderNav.js
  getClassPath (file, folder = '') {
    const relPath = this.getRelPath(file, folder)
    const jsPath = relPath.startsWith('component/') ? relPath : 'page/' + relPath
    const clsName = this.getClassName(file, folder)
    return File.resolve(File.dirname(jsPath), clsName + '.js')
  },

  // /path/user/register.html => UserRegister
  // /path/component/header/nav.html => HeaderNav
  // component/header/nav.html => HeaderNav
  getClassName (file, folder = '') {
    const relPath = this.getRelPath(file, folder)
    const filePath = relPath.replace('component/', '').replace('.html', '')
    return ExtendJS.toPascalCase(filePath)
  },

  // /path/component/header/nav.html => cmp-header-nav
  getCssClass (file, folder = '') {
    const relPath = this.getRelPath(file, folder)
    const filePath = relPath.replace('component/', '').replace('.html', '')
    return 'cmp-' + filePath.replaceAll('/', '-')
  },

  getRelPath (file, folder) {
    return folder ? file.replace(folder + '/', '') : file
  },

  getComponentData (node, replace = true) {
    const data = node.getAttributeNS(null, 'data-ss-component')
    const json = data ? JSON.parse(data) : null
    if (json && replace) this.replaceAllDataAttributes(json)
    return json
  },

  replaceAllDataAttributes (data) {
    if (!data) return
    for (const [name, value] of Object.entries(data)) {
      if (name === 'attributes') {
        this.replaceDataAttributes(value)
      } else if (typeof value === 'object') {
        this.replaceAllDataAttributes(value)
      }
    }
  },

  replaceDataAttributes (attributes) {
    this.replaceCamelCaseDataAttributes(attributes)
    for (const [name, obj] of Object.entries(attributes)) {
      obj.value = this.getAttributeValue(name, obj.value)
    }
  },

  replaceCamelCaseDataAttributes (attributes) {
    const camelCaseMap = this.getCamelCaseAttributeMap()
    for (const [name, obj] of Object.entries(attributes)) {
      if (name in camelCaseMap) {
        attributes[camelCaseMap[name]] = obj
        delete attributes[name]
      }
    }
  },

  getAttributeValue (name, value) {
    const shorts = this.getShortAttributes()
    // hidden="", open="true"
    return (shorts.includes(name) && (value === '' || value === 'true')) ? name : value
  },

  getCamelCaseAttributeMap () {
    return {
      class: 'className',
      srcset: 'srcSet',
      srclang: 'srcLang',
      autoplay: 'autoPlay',
      minlength: 'minLength',
      maxlength: 'maxLength',
      readonly: 'readOnly',
      autocomplete: 'autoComplete',
      for: 'htmlFor',
      checked: 'defaultChecked',
      formtarget: 'formTarget',
      formaction: 'formAction',
      formmethod: 'formMethod',
      enctype: 'encType',
      datetime: 'dateTime'
    }
  },

  getShortAttributes () {
    return ['hidden', 'disabled', 'readOnly', 'required', 'multiple', 'defaultChecked',
      'controls', 'autoPlay', 'loop', 'muted', 'default', 'reversed', 'open']
  },

  filterProperty (name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '')
  },

  getProperties (node) {
    const string = node.getAttributeNS(null, 'data-ss-properties')
    return string ? JSON.parse(string) : {}
  },

  setProperties (node, properties) {
    if (ExtendJS.isEmpty(properties)) {
      node.removeAttributeNS(null, 'data-ss-properties')
    } else {
      node.setAttributeNS(null, 'data-ss-properties', JSON.stringify(properties))
    }
  }
}
