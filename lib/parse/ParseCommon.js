const ExtendJS = require('../ExtendJS.js')
const File = require('../File.js')

module.exports = {
  // /path/user/register.html => /page/user/UserRegister.js
  // /path/component/header/nav.html => /component/header/HeaderNav.js
  // component/header/nav.html => /component/header/HeaderNav.js
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

  getRelPath (file, folder) {
    return folder ? file.replace(folder + '/', '') : ''
  },

  getComponentData (node) {
    const data = node.getAttributeNS(null, 'data-ss-component')
    return data ? JSON.parse(data) : null
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
  }
}
