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

  // wrap the tag with an <if></if> etc
  wrapNode (node, tag, document, attributes = {}) {
    const wrapper = document.createElementNS('http://www.w3.org/1999/xhtml', tag)
    for (const [name, value] of Object.entries(attributes)) {
      wrapper.setAttributeNS(null, name, value)
    }
    node.parentNode.insertBefore(wrapper, node)
    wrapper.appendChild(node)
    return wrapper
  },

  getComponentData (node, replace = true) {
    const data = node.getAttributeNS(null, 'data-ss-component')
    const json = data ? JSON.parse(data) : null
    if (json && replace) this.replaceAllAttributes(json)
    return json
  },

  replaceAllAttributes (data) {
    if (!data) return
    for (const [name, value] of Object.entries(data)) {
      if (name === 'attributes') {
        this.replaceAttributes(value)
      } else if (typeof value === 'object') {
        this.replaceAllAttributes(value)
      }
    }
  },

  replaceAttributes (attributes) {
    this.replaceCamelCaseAttributes(attributes)
    this.replaceShortAttributes(attributes)
  },

  // replace readonly with readOnly
  replaceCamelCaseAttributes (attributes) {
    const camelCaseMap = this.getCamelCaseAttributeMap()
    for (const [name, obj] of Object.entries(attributes)) {
      if (name in camelCaseMap) {
        attributes[camelCaseMap[name]] = obj
        delete attributes[name]
      }
    }
  },

  // replace readOnly="" with readOnly="readOnly"
  // replace defaultChecked="" with defaultChecked="true"
  replaceShortAttributes (attributes) {
    for (const [name, obj] of Object.entries(attributes)) {
      obj.value = this.getAttributeValue(name, obj.value)
    }
  },

  getAttributeValue (name, value) {
    if (name === 'defaultChecked' && value === '') {
      return 'true'
    } else {
      const shorts = this.getShortAttributes()
      return (shorts.includes(name) && value === '') ? name : value
    }
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
      checked: 'defaultChecked' // this one also needs a boolean value like `true`
    }
  },

  getShortAttributes () {
    return ['hidden', 'disabled', 'readOnly', 'required', 'multiple', 'controls', 'autoPlay',
      'loop', 'muted', 'default', 'reversed']
  },

  filterAttribute (name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '')
  }
}
