import React from 'react'
import { FormControl } from 'react-bootstrap'

import I18nManager from './I18nManager'

export default class Text extends I18nManager {
  handleTextChanged = event => {
    this.handleOnChange(event.target.value)
  }

  render() {
    return this.renderWrapped(
      <div style={{ width: '100%' }}>
        {this.props.required ? <strong>{this.props.schema.title} *</strong> : this.props.schema.title}
        <FormControl
          componentClass={this.props.uiSchema.$subtype === 'textarea' ? 'textarea' : 'input'}
          value={this.props.formData}
          onChange={this.handleTextChanged}
          placeholder={this.state.placeholder || ''}
        />
      </div>
    )
  }
}
