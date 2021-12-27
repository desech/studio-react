module.exports = {
  beautifyHtml (body, beautify, level = 0) {
    if (!body) return ''
    return beautify.html(body, {
      indent_size: 2,
      preserve_newlines: false,
      indent_level: level
    })
  }
}
