import React, { useState, useEffect } from 'react'
import { Route, Switch, Redirect } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ConnectedRouter } from 'react-router-redux'

import App from '../App/Layout'

import LoginPage from '../Pages/Account/Login'
import RegisterPage from '../Pages/Account/Register'
import ChangePassword from '../Pages/Account/ChangePassword'

import Auth, { getActiveWorkspace } from '../Auth'
import PrivateRoute from './PrivateRoute'
import store, { history } from '../store'
import { extractCookie } from '../utils/cookies'

import Confusion from './../Pages/Confusion'

import Workspace from '../Pages/Workspace'
import MyAccount from '../Pages/MyAccount'
import Bot from '../Pages/Bot'
import Debug from '../Pages/Server/Debug'
import Modules from '../Pages/Server/Modules'
import Monitoring from '~/Pages/Server/Monitoring'
import Versioning from '~/Pages/Server/Versioning'
import Languages from '~/Pages/Server/Languages'
import LicenseStatus from '~/Pages/Server/LicenseStatus'
import Alerting from '~/Pages/Server/Alerting'

import { LoginContainer } from '~/Pages/Layouts/LoginContainer'
import { Button } from '@blueprintjs/core'

export const makeMainRoutes = () => {
  const auth = new Auth()

  const ExtractToken = () => {
    auth.setSession({ expiresIn: 7200, idToken: extractCookie('userToken') })
    auth.setupWorkspace()

    return null
  }

  const NoAccess = () => {
    return (
      <LoginContainer subtitle={<strong>No access</strong>}>
        <p>Sorry, you do not have access to any workspace.</p>
        <Button text="Logout" onClick={auth.logout} />
      </LoginContainer>
    )
  }

  return (
    <Provider store={store}>
      <ConnectedRouter history={history}>
        <Switch>
          <Route path="/login/:strategy?/:workspace?" render={props => <LoginPage auth={auth} {...props} />} />
          <Route path="/register/:strategy?/:workspace?" render={props => <RegisterPage auth={auth} {...props} />} />
          <Route path="/setToken" component={ExtractToken} />
          <Route path="/changePassword" render={props => <ChangePassword auth={auth} {...props} />} />
          <Route path="/noAccess" component={NoAccess} />
          <PrivateRoute path="/" auth={auth} component={App}>
            <Switch>
              <Route path="/profile" component={MyAccount} />
              <Route path="/confusion" component={Confusion} />
              <Route path="/server/monitoring" component={Monitoring} />
              <Route path="/server/version" component={Versioning} />
              <Route path="/server/languages" component={Languages} />
              <Route path="/server/debug" component={Debug} />
              <Route path="/server/license" component={LicenseStatus} />
              <Route path="/server/alerting" component={Alerting} />
              <Route path="/workspace/:workspaceId?" component={Workspace} />
              <Route path="/server" component={Server} />
              <Route path="/bot" component={Bot} />
              <Route path="/debug" component={Debug} />
              <Route path="/modules" component={Modules} />
              <Route path="/" render={() => <Redirect from="/" to={`/workspace/${getActiveWorkspace()}/bots`} />} />
            </Switch>
          </PrivateRoute>
        </Switch>
      </ConnectedRouter>
    </Provider>
  )
}
