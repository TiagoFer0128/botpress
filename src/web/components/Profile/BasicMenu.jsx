import React, { Component } from 'react'
import { MenuItem } from 'react-bootstrap'

class BasicMenu extends Component {

  render() {
    return <div>
			<a href="#" onClick={this.props.logout}>Logout</a>
		</div>
  }
}

export default BasicMenu