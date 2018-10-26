import React, { Component, Fragment } from 'react'
import { Redirect } from 'react-router-dom'
import logo from '../media/nobg_white.png'

import { Alert, Card, CardBody, CardTitle, Button, Input, CardText } from 'reactstrap'

export default class ChangePassword extends Component {
  constructor(props) {
    super(props)

    this.state = {
      ...props.location.state,
      newPassword: '',
      confirmPassword: ''
    }
  }

  login = async () => {
    this.setState({ error: null })

    if (this.state.newPassword !== this.state.confirmPassword) {
      this.setState({ error: `Passwords don't match` })
      return
    }

    try {
      await this.props.auth.login({
        username: this.state.username,
        password: this.state.password,
        newPassword: this.state.newPassword
      })
    } catch (err) {
      this.setState({ error: err.message })
    }
  }

  onInputChange = name => event => {
    this.setState({ [name]: event.target.value })
  }

  onInputKeyPress = e => {
    if (e.key === 'Enter') {
      this.login()
    }
  }

  renderForm = () => {
    if (!this.state.username) {
      return <Redirect to="/" />
    }

    return (
      <Fragment>
        <CardTitle>Botpress Admin Panel</CardTitle>
        <CardText>Either it is your first time or your password is expired. Please change it.</CardText>
        {this.state.error && <Alert color="danger">{this.state.error}</Alert>}
        <Input
          value={this.state.newPassword}
          onChange={this.onInputChange('newPassword')}
          type="password"
          name="newPassword"
          id="newPassword"
          onKeyPress={this.onInputKeyPress}
          placeholder="Password"
        />
        <Input
          value={this.state.confirmPassword}
          onChange={this.onInputChange('confirmPassword')}
          type="password"
          name="confirmPassword"
          id="confirmPassword"
          onKeyPress={this.onInputKeyPress}
          placeholder="Confirm"
        />
        <p>
          <Button onClick={this.login}>Change</Button>
        </p>
      </Fragment>
    )
  }

  render() {
    const isAuthenticated = this.props.auth.isAuthenticated()

    if (isAuthenticated) {
      return (
        <Redirect
          to={{
            pathname: '/'
          }}
        />
      )
    }

    return (
      <div className="centered-container">
        <div className="middle">
          <div className="inner">
            <img className="logo" src={logo} alt="loading" />
            <Card body>
              <CardBody className="login-box">{this.renderForm()}</CardBody>
            </Card>
          </div>
        </div>
      </div>
    )
  }
}
