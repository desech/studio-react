export default class ExtendJS {
  static toPascalCase (string) {
    return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) return ''
      return match.toUpperCase()
    }).replace(/\W/g, '')
  }

  static isEmpty (obj) {
    return !obj || (Object.keys(obj).length === 0 && obj.constructor === Object)
  }

  static objectFlip (obj) {
    const ret = {}
    Object.keys(obj).forEach(key => {
      ret[obj[key]] = key
    })
    return ret
  }

  static mergeDeep (target, ...sources) {
    if (!sources.length) return target
    const source = sources.shift()
    if (typeof target === 'object' && typeof source === 'object') {
      for (const key in source) {
        if (typeof source[key] === 'object') {
          if (!target[key]) Object.assign(target, { [key]: {} })
          this.mergeDeep(target[key], source[key])
        } else {
          Object.assign(target, { [key]: source[key] })
        }
      }
    }
    return this.mergeDeep(target, ...sources)
  }
}
