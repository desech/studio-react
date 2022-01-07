export default class DS {
  // check if value exists
  static e (value) {
    return (typeof value !== 'undefined')
  }

  static getDesechData (props, component) {
    const data = {}
    this.setDefaults(component.defaults, data)
    return data
  }

  static setDefaults (defaults, data) {
    for (const [ref, value] of Object.entries(defaults)) {
      this.setDefaultValue(data, ref, value)
    }
  }

  static setDefaultValue (data, ref, value) {
    if (value.tag) {
      data[ref + 'Tag'] = value.tag
    } else if (value.unrender) {
      data[ref + 'Unrender'] = true
    }
  }
}
