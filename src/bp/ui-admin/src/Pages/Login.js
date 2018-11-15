import React, { Component, Fragment } from 'react'
import { Redirect } from 'react-router-dom'
import logo from '../media/nobg_white.png'

import { Alert, Card, CardBody, CardTitle, Button, Input, FormGroup, CardText } from 'reactstrap'

export default class Login extends Component {
  state = { username: '', password: '', passwordExpired: false, error: null }

  login = async ({ username, password, showError = true } = {}) => {
    this.setState({ error: null })

    try {
      await this.props.auth.login({
        username: username || this.state.username,
        password: password || this.state.password
      })
    } catch (err) {
      if (err.type === 'PasswordExpiredError') {
        if (!this.state.username || !this.state.password) {
          this.setState({ username, password })
        }

        this.setState({ passwordExpired: true })
      } else {
        showError && this.setState({ error: err.message })
      }
    }
  }

  componentDidMount() {
    // When we first load the page, we try to connect with default credentials automatically
    // We don't display an error if the default credentials fail
    this.login({ username: 'admin', password: '', showError: false })
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
    if (this.state.passwordExpired) {
      return <Redirect to={{ pathname: '/ChangePassword', state: this.state }} />
    }

    return (
      <Fragment>
        <CardTitle>Botpress Admin Panel</CardTitle>
        <CardText>Login</CardText>
        {this.state.error && <Alert color="danger">{this.state.error}</Alert>}
        <FormGroup>
          <label htmlFor="username">Username</label>
          <Input
            value={this.state.username}
            onChange={this.onInputChange('username')}
            type="text"
            name="username"
            id="username"
            onKeyPress={this.onInputKeyPress}
          />
        </FormGroup>
        <FormGroup>
          <label htmlFor="password">Password</label>
          <Input
            value={this.state.password}
            onChange={this.onInputChange('password')}
            type="password"
            name="password"
            id="password"
            onKeyPress={this.onInputKeyPress}
          />
        </FormGroup>
        <p>
          <Button onClick={this.login}>Sign in</Button>
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
