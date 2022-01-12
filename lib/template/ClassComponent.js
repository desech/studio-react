import React from 'react'
import PropTypes from 'prop-types'
// desech - start import block
// desech - end import block

export default class CLASSNAME extends React.Component {
  render () {
    const d = DS.getDesechData(this.props, this.getComponentData()) // eslint-disable-line
    // desech - start render block
    // desech - end render block
    return render
  }

  getComponentData () {
    // desech - start data block
    // desech - end data block
    return data
  }
}

CLASSNAME.propTypes = {
  dRef: PropTypes.string,
  dOverrides: PropTypes.object,
  dVariants: PropTypes.object
}
