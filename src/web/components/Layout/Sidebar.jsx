import React, {Component} from 'react'
import {Link} from 'react-router'
import classnames from 'classnames'

import ReactSidebar from 'react-sidebar'
import {connect} from 'nuclear-js-react-addons'

import SidebarHeader from './SidebarHeader'
import getters from '~/stores/getters'
import actions from '~/actions'

const style = require('./Sidebar.scss')

@connect(props => ({ modules: getters.modules }))
class Sidebar extends Component {

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  }

  constructor(props, context) {
    super(props, context)

    this.state = {
      sidebarOpen: false,
      sidebarDocked: false,
      license: "AGPL-3.0"
    }

    this.onSetSidebarOpen = this.onSetSidebarOpen.bind(this)
    this.mediaQueryChanged = this.mediaQueryChanged.bind(this)
    this.renderModuleItem = this.renderModuleItem.bind(this)
    this.openLicenseComponent = this.openLicenseComponent.bind(this)
  }

  onSetSidebarOpen(open) {
    this.setState({sidebarOpen: open})
  }

  componentWillMount() {
    var mql = window.matchMedia(`(min-width: 800px)`)
    mql.addListener(this.mediaQueryChanged)
    this.setState({mql: mql, sidebarDocked: mql.matches})
  }

  componentWillUnmount() {
    this.state.mql.removeListener(this.mediaQueryChanged)
  }

  mediaQueryChanged() {
    this.setState({sidebarDocked: this.state.mql.matches})
  }

  routeActive(paths) {
    paths = Array.isArray(paths) ? paths : [paths]
    for (let p in paths) {
      if (this.context.router.isActive(paths[p])) {
        return true
      }
    }

    return false
  }

  isAtDashboard() {
    return ['', '/', '/dashboard'].includes(location.pathname)
  }

  isAtManage() {
    return ['/manage'].includes(location.pathname)
  }

  renderModuleItem(module) {
    const path = `/modules/${module.name}`
    const className = classnames({
      [style.active]: this.routeActive(path)
    })

    return <li key={`menu_module_${module.name}`} className={className}>
      <Link to={path} title={module.menuText}>
        <i className="icon material-icons">{module.menuIcon}</i>
        <span>{module.menuText}</span>
      </Link>
    </li>
  }

  openLicenseComponent() {
    actions.toggleLicenseModal()
  }

  render() {
    const modules = this.props.modules
    const items = modules.toJS().map(this.renderModuleItem)
    const dashboardClassName = classnames({ [style.active] : this.isAtDashboard() })
    const manageClassName = classnames({ [style.active] : this.isAtManage() })

    const sidebarContent = <div className={style.sidebar}>
      <SidebarHeader/>
      <ul className="nav">
        <li className={dashboardClassName} key="dashboard">
          <Link to='dashboard' title='Dashboard'>
            <i className="icon material-icons">dashboard</i>
            Dashboard
          </Link>
        </li>
        <li className={manageClassName} key="manage">
          <Link to='manage' title='Modules'>
            <i className="icon material-icons">build</i>
            Modules
          </Link>
        </li>
        {items}
      </ul>
      <div className={style.license}>
        <Link to='#' title='License' onClick={this.openLicenseComponent}>
          License under {this.state.license}
        </Link>
      </div>
    </div>


    const { sidebarOpen: open, sidebarDocked: docked } = this.state

    return (
      <ReactSidebar
        sidebar={sidebarContent}
        open={open}
        docked={docked}
        shadow={false}
        styles={{ sidebar: { zIndex: 20 } }}
        onSetOpen={this.onSetSidebarOpen}>
        {this.props.children}
      </ReactSidebar>
    )
  }
}

Sidebar.contextTypes = {
  reactor: React.PropTypes.object.isRequired
}

export default Sidebar
