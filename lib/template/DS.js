export default class DS {
  // check if value exists
  static e (value) {
    return (typeof value !== 'undefined')
  }

  static getDesechData (props, component) {
    const data = {}
    for (const [ref, value] of Object.entries(component.defaults)) {
      data[ref + 'Tag'] = value.tag
    }
    return data
  }
}
