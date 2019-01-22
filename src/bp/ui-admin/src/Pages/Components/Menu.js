import React, { Component } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Navbar, Nav, NavItem, NavLink, Badge } from 'reactstrap'
import { Link, withRouter } from 'react-router-dom'
import { fetchLicense } from '../../reducers/license'
import { fetchPermissions } from '../../reducers/user'
import _ from 'lodash'
import { checkRule } from 'common/auth'
import { isAuthenticated as isAuthenticatedLicensing } from '../../Auth/licensing'

class Menu extends Component {
  constructor(props) {
    super(props)
    this.state = { menu: [] }
  }

  componentDidMount() {
    this.props.fetchLicense()
    this.generateMenu()
  }

  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      this.generateMenu()
    }
  }

  generateMenu() {
    const activePage = this.props.activePage
    const currentPath = _.get(this.props, 'location.pathname', '')

    const menu = [
      {
        title: 'Collaborators',
        active: activePage === 'users',
        show: true,
        disabled: this.isCommunity(),
        link: '/users',
        isPro: true
      },
      {
        title: 'Bots',
        active: activePage === 'bots',
        show: true,
        link: '/bots'
      },
      {
        title: 'Roles',
        active: activePage === 'roles',
        show: true,
        link: '/roles'
      },
      {
        title: 'Licensing',
        active: activePage === 'license',
        show: true,
        link: '/licensing',
        childs: [
          {
            title: 'Login',
            active: activePage === 'licensing-login',
            link: `/licensing/login`,
            show: currentPath.includes('licensing') && !isAuthenticatedLicensing()
          },
          {
            title: 'Logout',
            active: activePage === 'licensing-logout',
            link: `/licensing/logout`,
            show: currentPath.includes('licensing') && isAuthenticatedLicensing()
          },
          {
            title: 'Manage Keys',
            active: activePage === 'licensing-keys',
            link: `/licensing/keys`,
            show: currentPath.includes('licensing') && isAuthenticatedLicensing()
          }
        ]
      }
    ]

    this.setState({ menu })
  }

  checkPermissions = (resource, operation) => {
    if (!this.props.currentTeam || !this.props.currentUserPermissions) {
      return false
    }

    return checkRule(this.props.currentUserPermissions, operation, resource)
  }

  render() {
    const filtered = _.filter(this.state.menu, { show: true })
    return (
      <Navbar>
        <Nav className="bp-menu-aside-level1">
          {filtered.map(section => (
            <NavItem key={section.title} active={section.active}>
              <NavLink className="btn-sm" tag={Link} disabled={section.disabled} to={section.link}>
                {section.title} {this.renderBadge(section.isPro)}
              </NavLink>
              {this.renderSubMenu(section.childs, section.subHeader)}
            </NavItem>
          ))}
        </Nav>
      </Navbar>
    )
  }

  renderSubMenu(childs, subHeader) {
    const filtered = _.filter(childs, { show: true })
    return (
      <Nav className="bp-menu-aside-level2">
        {subHeader && <div className="bp-menu-aside-level2__botname">{subHeader}</div>}
        {filtered.map(child => (
          <NavItem key={child.title} active={child.active}>
            <NavLink
              className="btn-sm"
              tag={Link}
              disabled={child.disabled || (child.isPro && this.isCommunity())}
              to={child.link}
            >
              {child.title} {this.renderBadge(child.isPro)}
            </NavLink>
          </NavItem>
        ))}
      </Nav>
    )
  }

  renderBadge = isBadge => (isBadge && this.isCommunity() ? <Badge color="primary">Pro</Badge> : null)
  isCommunity = () => !this.props.license || !this.props.license.isPro
}

const mapStateToProps = state => ({
  license: state.license.license,
  currentUserPermissions: state.user.permissions,
  licensingAccount: state.license.licensingAccount
})

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      fetchPermissions,
      fetchLicense
    },
    dispatch
  )
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Menu))
