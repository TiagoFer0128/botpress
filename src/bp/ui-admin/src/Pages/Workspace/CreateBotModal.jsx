import React, { Component } from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { Button, Modal, ModalHeader, ModalBody, FormGroup, FormFeedback, Label, Input } from 'reactstrap'
import { MdGroupAdd } from 'react-icons/lib/md'
import Select from 'react-select'

import api from '../../api'
import { fetchBotTemplates, fetchBotCategories } from '../../reducers/bots'

// TODO add form validation
// TODO add error message when create bot fails
// TODO add category in post
// TODO move create bot in reducer action

class CreateBotModal extends Component {
  state = {
    name: '',
    template: '',
    category: '',
    error: null
  }

  componentDidMount() {
    if (!this.props.botCategoriesFetched) {
      this.props.fetchBotCategories()
    }
    if (!this.props.templateFetched) {
      this.props.fetchBotTemplates()
    }
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.botCategoriesFetched && this.props.botCategoriesFetched && this.props.botCategories.length) {
      this.setState({
        category: this.props.botCategories[0]
      })
    }
    if (!prevProps.templateFetched && this.props.templateFetched && this.props.botCategories.length) {
      this.setState({
        template: this.props.templates[0]
      })
    }
  }

  isFormValid = () => {
    // TODO implement this properly
    return true
  }

  handleNameChanged = e => {
    this.setState({ name: e.target.value })
  }

  handleTemplateChanged = template => {
    this.setState({ template })
  }

  handleCategoryChanged = e => {
    this.setState({
      category: e.target.value
    })
  }

  stanitizeName = () => {
    return this.state.name
      .toLowerCase()
      .replace(/\s/g, '-')
      .replace(/[$&+,:;=?@#|'<>.^*()%!]/g, '')
  }

  createBot = async e => {
    e.preventDefault()

    if (!this.isFormValid()) {
      return
    }

    const name = this.state.name
    const id = this.stanitizeName()

    const template = _.pick(this.state.template, ['id', 'moduleId'])

    //TODO extrat this in reducer
    try {
      await api
        .getSecured()
        .post(`/admin/bots`, { id, name, template: template.id !== undefined ? template : undefined })
      this.props.onCreateBotSuccess && this.props.onCreateBotSuccess()
      this.props.toggle()
    } catch (error) {
      this.setState({ error })
    }
  }

  render() {
    const templateModules = _.uniq(this.props.botTemplates.map(m => m.moduleName))
    const templates = templateModules.map(mod => ({
      label: mod,
      options: _.filter(this.props.botTemplates, x => x.moduleName === mod)
    }))

    return (
      <Modal isOpen={this.props.isOpen} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>Create a new bot</ModalHeader>
        <ModalBody>
          <form
            onSubmit={this.createBot}
            ref={form => {
              this.formEl = form
            }}
          >
            <FormGroup>
              <Label for="name">
                <strong>Name</strong>
              </Label>
              <Input type="text" id="name" value={this.state.name} onChange={this.handleNameChanged} />
              <FormFeedback>The bot name should have at least 4 characters.</FormFeedback>
            </FormGroup>
            {this.props.botTemplates.length > 0 && (
              <FormGroup>
                <Label for="template">
                  <strong>Bot Template</strong>
                </Label>
                <Select
                  getOptionLabel={o => o.name}
                  getOptionValue={o => o.id}
                  options={templates}
                  value={this.state.template}
                  onChange={this.handleTemplateChanged}
                />
              </FormGroup>
            )}
            {this.props.botCategories.length > 0 && (
              <FormGroup>
                <Label for="category">
                  <strong>Bot Category</strong>
                </Label>
                <Input type="select" value={this.state.category} onChange={this.handleCategoryChanged}>
                  {this.props.botCategories.map(cat => (
                    <option value={cat} key={cat}>
                      {cat}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            )}
            <Button className="float-right" type="submit" color="primary" disabled={!this.isFormValid()}>
              <MdGroupAdd /> Create bot
            </Button>
          </form>
        </ModalBody>
      </Modal>
    )
  }
}

const mapStateToProps = state => ({
  ...state.bots
})

const mapDispatchToProps = {
  fetchBotTemplates,
  fetchBotCategories
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateBotModal)
