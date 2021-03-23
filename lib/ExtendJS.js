module.exports = {
  capitalize (string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  },

  unique (array) {
    return [...new Set(array)]
  }
}
