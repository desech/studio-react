module.exports = {
  capitalize (string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  },

  toCamelCase (string) {
    return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) return ''
      return (index === 0) ? match.toLowerCase() : match.toUpperCase()
    }).replace(/\W/g, '')
  },

  unique (array) {
    return [...new Set(array)]
  }
}
