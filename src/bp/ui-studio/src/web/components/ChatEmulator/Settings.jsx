import React from 'react'
import { Modal, Button, Form, FormControl } from 'react-bootstrap'

import _ from 'lodash'

export default class Settings extends React.Component {
  state = {
    userId: '',
    externalToken: ''
  }

  componentDidUpdate(prevProps) {
    if (this.props !== prevProps) {
      this.setState({
        userId: this.props.userId,
        externalToken: this.props.externalToken,
        isSendingRawPayload: this.props.isSendingRawPayload
      })
    }
  }

  handleSave = () => {
    this.props.onUpdateSettings({
      userId: this.state.userId,
      externalToken: this.state.externalToken,
      isSendingRawPayload: this.state.isSendingRawPayload
    })
    this.props.onHideSettings()
  }

  handleToggle = event => this.setState({ [event.target.name]: event.target.checked })
  handleOnChange = event => this.setState({ [event.target.name]: event.target.value })

  render() {
    return (
      <Modal show={this.props.show} onHide={this.props.onHideSettings}>
        <Modal.Header>
          <strong>Configure Emulator Settings</strong>
        </Modal.Header>
        <Modal.Body>
          <div>
            <h5>Send Raw Payloads (JSON mode)</h5>
            <FormControl
              type="checkbox"
              checked={this.state.isSendingRawPayload}
              onChange={this.handleToggle}
              name="isSendingRawPayload"
            />
            <h5>User ID</h5>
            <FormControl
              type="text"
              name="userId"
              value={this.state.userId}
              onChange={this.handleOnChange}
              placeholder="Choose a custom User ID"
            />

            <h5>External Authentication Token</h5>
            <FormControl
              type="text"
              as="textarea"
              rows="3"
              name="externalToken"
              value={this.state.externalToken}
              onChange={this.handleOnChange}
              placeholder="Type a valid JWT token"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="default" onClick={this.props.onHideSettings}>
            Cancel
          </Button>
          <Button bsStyle="primary" onClick={this.handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}
