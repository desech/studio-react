import ExtendJS from './ExtendJS.js'

export default class DS {
  // check if the value exists
  static e (value) {
    return (typeof value !== 'undefined')
  }

  static getDesechData (props, component) {
    const data = {}
    this.setRootElement(props, data)
    this.setDefaults(component?.defaults, data)
    this.setOverrides(props, component?.variants, data)
    // console.log(data)
    return data
  }

  static setRootElement (props, data) {
    if (props.dRef) data.componentRef = props.dRef
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

  // here we have the overrides for the children components
  static setDefaults (defaults, data) {
    if (!defaults) return
    for (const [ref, object] of Object.entries(defaults)) {
      for (const [name, value] of Object.entries(object)) {
        // name = tag, unrender, component, overrides, variants
        data[ref + ExtendJS.toPascalCase(name)] = value
      }
    }
  }

  // here we have the overrides for the component elements, coming from the parent
  static setOverrides (props, variantOverrides, data) {
    if (!props.dOverrides) return
    for (const [ref, obj] of Object.entries(props.dOverrides)) {
      // we want variants to go first, then the overrides, so let's do it here
      if (obj.variants) {
        this.setVariantsValue(data, ref, obj.variants, variantOverrides)
      }
      for (const [name, value] of Object.entries(obj)) {
        this.setValue(data, ref, name, value)
      }
    }
  }

  static setVariantsValue (data, ref, variants, variantOverrides) {
    console.log(variants, variantOverrides)
    data[ref + 'Variants'] = variants
    if (!variantOverrides) return
    if (!data[ref + 'Overrides']) data[ref + 'Overrides'] = {}
    for (const [name, value] of Object.entries(variants)) {console.log(name, value)
      if (variantOverrides[name] && variantOverrides[name][value]) {
        console.log('xxx', variantOverrides[name][value])
        this.mergeObjects(data[ref + 'Overrides'], variantOverrides[name][value])
      }
    }
  }

  static setValue (data, ref, name, value) {
    switch (name) {
      case 'tag': case 'inner': case 'component':
        data[ref + ExtendJS.toPascalCase(name)] = value
        break
      case 'attributes':
        this.setUnrenderValue(data, ref, value)
        this.setAttributesValue(data, ref, value)
        break
      case 'properties':
        this.clearInvalidProperties(data, ref, value)
        this.setAttributesValue(data, ref, value)
        break
      case 'classes':
        this.setClassesValue(data, ref, value)
        break
      case 'children': case 'overrides':
        this.setOverridesValue(data, ref, value)
        break
      case 'variants': default:
        // we already did the variants before the loop
    }
  }

  static setUnrenderValue (data, ref, attributes) {
    if (!attributes['data-ss-unrender']) return
    data[ref + 'Unrender'] = ('value' in attributes['data-ss-unrender'])
    delete attributes['data-ss-unrender']
  }

  // we can't override these properties since we use code to show them
  // @todo maybe improve this in the future
  static clearInvalidProperties (data, ref, properties) {
    for (const name of ['reactIf', 'reactFor', 'reactIfFor', 'reactForIf']) {
      if (name in properties) delete properties[name]
    }
  }

  static setAttributesValue (data, ref, attributes) {
    for (const [name, obj] of Object.entries(attributes)) {
      if (obj.delete) {
        data[ref + 'Attrdel' + ExtendJS.toPascalCase(name)] = true
      } else { // value
        // if this value contains code like `{user}` it will not be parsed as code
        // @todo maybe improve this in the future
        data[ref + 'Attr' + ExtendJS.toPascalCase(name)] = obj.value
      }
    }
  }

  static setClassesValue (data, ref, classes) {
    for (const [name, obj] of Object.entries(classes)) {
      if (obj.delete) {
        data[ref + 'Clsdel' + ExtendJS.toPascalCase(name)] = true
      } else { // add
        data[ref + 'Cls' + ExtendJS.toPascalCase(name)] = name
      }
    }
  }

  static setOverridesValue (data, ref, overrides) {
    if (!data[ref + 'Overrides']) {
      data[ref + 'Overrides'] = overrides
    } else {
      this.mergeObjects(data[ref + 'Overrides'], overrides)
    }
  }

  // obj1 is mutated; obj2 is placed on top of obj1
  static mergeObjects (obj1, obj2) {
    ExtendJS.mergeDeep(obj1, obj2)
    this.mergeObjectsFix(obj1)
  }

  // mergeDeep will merge everything including the attribute/property/class values
  // if we have these pairs value/delete or add/delete, remove the first value
  static mergeObjectsFix (obj) {
    if (ExtendJS.isEmpty(obj)) return
    if (Object.keys(obj).length === 2 && (('value' in obj && 'delete' in obj) ||
      ('add' in obj && 'delete' in obj))) {
      delete obj[Object.keys(obj)[0]]
    }
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        this.mergeObjectsFix(obj[key])
      }
    }
  }
}
