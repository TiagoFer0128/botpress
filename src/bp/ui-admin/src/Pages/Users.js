import React, { Component } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { Button, Modal, FormGroup, Input, Label, FormFeedback, ModalHeader, ModalBody, ModalFooter } from 'reactstrap'
import { MdGroupAdd } from 'react-icons/lib/md'
import Joi from 'joi-browser'
import UserList from './Components/UserList'
import SectionLayout from './Layouts/Section'
import api from '../api'
import { fetchUsers } from '../modules/user'

const UserEmailValidationSchema = Joi.string()
  .email()
  .trim()

class List extends Component {
  state = {
    isCreateUserModalOpen: false,
    isRenderEmailModalOpen: false,
    email: '',
    createUserError: null
  }

  componentDidMount() {
    this.loadAuthStrategy()
  }

  loadAuthStrategy = async () => {
    const { data } = await api.getAnonymous().get('/auth/config')
    this.setState({ authStrategy: data.payload.strategy })
  }

  toggleCreateUserModalOpen = () => {
    this.setState({ isCreateUserModalOpen: !this.state.isCreateUserModalOpen })
  }

  toggleRenderEmailModal = () => {
    this.setState({ isRenderEmailModalOpen: !this.state.isRenderEmailModalOpen })
  }

  onInputKeyPress = e => e.key === 'Enter' && this.createUser()

  onNewUserEmailChange = event => {
    const { error } = Joi.validate(event.target.value, UserEmailValidationSchema)

    this.setState({
      email: event.target.value,
      canCreateUser: !error,
      createUserError: error
    })
  }

  async createUser() {
    const {
      data: { payload }
    } = await api.getSecured().post('/admin/users', {
      email: this.state.email
    })

    const message = `Your botpress account is ready! 

Sign-in here: ${window.location.origin}/admin/login
Email: ${this.state.email}
Password: ${payload.tempPassword}`

    this.setState({
      email: '',
      isCreateUserModalOpen: false,
      isRenderEmailModalOpen: true,
      emailSubject: 'Account creation successful',
      emailMessage: message,
      createUserError: null
    })

    this.props.fetchUsers()
  }

  async resetPassword(user, list) {
    if (window.confirm(`Are you sure you want to reset ${user.email}'s password?`)) {
      const {
        data: { payload }
      } = await api.getSecured().get(`/admin/users/reset/${user.id}`)

      const message = `Your password has been reset.
     
Email: ${user.email}
Password: ${payload.tempPassword}`

      this.setState({
        isRenderEmailModalOpen: true,
        emailSubject: 'Password reset',
        emailMessage: message,
        createUserError: null
      })
    }
  }

  async deleteUser(user, list) {
    if (window.confirm(`Are you sure you want to delete ${user.email}'s account?`)) {
      await api.getSecured().delete(`/admin/users/${user.id}`)
    }
  }

  onCopy = () => {
    this.setState({ copied: true })
    window.setTimeout(() => {
      this.setState({ copied: false })
    }, 750)
  }

  renderEmailModal() {
    return (
      <Modal isOpen={this.state.isRenderEmailModalOpen} toggle={this.toggleRenderEmailModal}>
        <ModalHeader toggle={this.toggleRenderEmailModal}>{this.state.emailSubject}</ModalHeader>
        <ModalBody>
          <Input type="textarea" readOnly={true} style={{ height: 160 }} value={this.state.emailMessage} />
        </ModalBody>
        <ModalFooter>
          <CopyToClipboard text={this.state.emailMessage} onCopy={this.onCopy}>
            <Button>{this.state.copied ? 'Copied!' : 'Copy to clipboard'}</Button>
          </CopyToClipboard>
        </ModalFooter>
      </Modal>
    )
  }

  renderCreateUserModal() {
    return (
      <Modal isOpen={this.state.isCreateUserModalOpen} toggle={this.toggleCreateUserModalOpen}>
        <ModalHeader toggle={this.toggleCreateUserModalOpen}>Create a new user</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="email">E-mail</Label>
            <Input
              id="email"
              onChange={this.onNewUserEmailChange}
              onKeyPress={this.onInputKeyPress}
              invalid={!!this.state.createUserError}
              value={this.state.email}
            />
            {!!this.state.createUserError && <FormFeedback>{this.state.createUserError.message}</FormFeedback>}
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" disabled={!this.state.canCreateUser} onClick={() => this.createUser()}>
            <MdGroupAdd /> Create
          </Button>
        </ModalFooter>
      </Modal>
    )
  }

  renderAllUsers() {
    const resetPassword = {
      label: 'Reset Password',
      type: 'link',
      onClick: user => this.resetPassword(user)
    }

    const deleteUser = {
      label: 'Delete',
      type: 'link',
      needRefresh: true,
      onClick: user => this.deleteUser(user)
    }

    const actions = this.state.authStrategy === 'basic' ? [resetPassword, deleteUser] : [deleteUser]

    return (
      <div>
        <UserList actions={actions} detailed="true" />
      </div>
    )
  }

  renderSideMenu() {
    return (
      <div>
        <Button className="float-right" color="primary" size="sm" onClick={this.toggleCreateUserModalOpen}>
          <MdGroupAdd /> Create user
        </Button>
        {this.renderCreateUserModal()}
        {this.renderEmailModal()}
      </div>
    )
  }

  render() {
    return (
      <SectionLayout
        title="Users"
        helpText="Add or delete user"
        activePage="users"
        mainContent={this.renderAllUsers()}
        sideMenu={this.renderSideMenu()}
      />
    )
  }
}

const mapStateToProps = state => ({
  loading: state.user.loadingUsers
})

const mapDispatchToProps = dispatch => bindActionCreators({ fetchUsers }, dispatch)

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(List)
