module.exports = {
  toPascalCase (string) {
    return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) return ''
      return match.toUpperCase()
    }).replace(/\W/g, '')
  },

  isEmpty (obj) {
    return !obj || (Object.keys(obj).length === 0 && obj.constructor === Object)
  },

  unique (array) {
    return [...new Set(array)]
  },

  removeFromArray (array, value) {
    const index = array.indexOf(value)
    if (index !== -1) array.splice(index, 1)
  },

  splitByCharacter (string, delimiter, wrap1 = '(', wrap2 = ')') {
    // regex is /(?![^(]*\))/gi
    const regex = new RegExp(`${delimiter}(?![^${wrap1}]*\\${wrap2})`, 'gi')
    return string.split(regex)
  }
}
