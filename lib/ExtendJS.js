module.exports = {
  toPascalCase (string) {
    return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) return ''
      return match.toUpperCase()
    }).replace(/\W/g, '')
  },

  unique (array) {
    return [...new Set(array)]
  }
}
