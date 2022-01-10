export default class DS {
  // check if the value exists
  static e (value) {
    return (typeof value !== 'undefined')
  }

  static capitalize (string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  static getDesechData (props, component) {
    const data = {}
    this.setDefaults(component?.defaults, data)
    this.setRootElement(props, data)
    return data
  }

  static setDefaults (defaults, data) {
    if (!defaults) return
    for (const [ref, object] of Object.entries(defaults)) {
      for (const [name, value] of Object.entries(object)) {
        // name = tag, unrender, overrides, variants
        data[ref + this.capitalize(name)] = value
      }
    }
  }

  static setRootElement (props, data) {
    data.componentRef = props.dRef
    if (props.dVariants) {
      data.componentVariants = this.buildDataVariant(props.dVariants)
    }
  }

  static buildDataVariant (variants) {
    // data-variant="foo-var=bar-val foo2=bar2 foo3=bar3"
    if (!variants) return ''
    return Object.entries(variants).reduce((array, variant) => {
      return [...array, variant.join('=')]
    }, []).join(' ')
  }
}
