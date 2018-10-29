import React, { Component } from 'react'

import { IoIosBoxOutline } from 'react-icons/lib/io'
import { MdCreate } from 'react-icons/lib/md'

import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { checkRule } from '@botpress/util-roles'

import jdenticon from 'jdenticon'

import {
  ListGroup,
  Jumbotron,
  ListGroupItemHeading,
  ListGroupItem,
  Row,
  Col,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  FormFeedback,
  Label,
  Input
} from 'reactstrap'

import _ from 'lodash'

import { fetchTeamData, fetchLicense } from '../../modules/teams'
import { fetchPermissions } from '../../modules/user'

import SectionLayout from '../Layouts/Section'
import LoadingSection from '../Components/LoadingSection'
import { getMenu } from './menu'

import api from '../../api'

class Bots extends Component {
  state = {
    isCreateBotModalOpen: false,
    errorCreateBot: undefined,
    id: '',
    name: '',
    description: ''
  }

  renderLoading() {
    return <LoadingSection />
  }

  componentDidMount() {
    this.props.fetchLicense()
    this.props.fetchTeamData(this.props.teamId, { bots: true })
    this.props.fetchPermissions(this.props.teamId)
  }

  componentDidUpdate(prevProps) {
    if ((!this.props.bots && !this.props.loading) || prevProps.teamId !== this.props.teamId) {
      this.props.fetchTeamData(this.props.teamId, { bots: true })
    }
    if (prevProps.teamId !== this.props.teamId) {
      this.props.fetchPermissions(this.props.teamId)
    }
  }

  createBot = async () => {
    const botForm = {
      id: this.state.id,
      name: this.state.name,
    }

    await api
      .getSecured()
      .post(`/api/teams/${this.props.teamId}/bots`, botForm)
      .catch(err => this.setState({ errorCreateBot: err }))
    await this.props.fetchTeamData(this.props.teamId)
    this.toggleCreateBotModal()
  }

  toggleCreateBotModal = () => this.setState({ isCreateBotModalOpen: !this.state.isCreateBotModalOpen })

  generateBotId() {
    const id = this.state.name
      .toLowerCase()
      .replace(/\s/g, '-')
      .replace(/[$&+,:;=?@#|'<>.^*()%!]/g, '')
    this.setState({ id })
  }

  renderCreateBot() {
    return (
      <Modal isOpen={this.state.isCreateBotModalOpen} toggle={this.toggleCreateBotModal}>
        <ModalHeader toggle={this.toggleCreateBotModal}>Create a new bot</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="id">
              <strong>Identifier</strong>
            </Label>
            <Input
              placeholder="Auto-generated"
              disabled="disabled"
              type="text"
              id="id"
              value={this.state.id}
              onChange={event => this.setState({ id: event.target.value })}
            />
          </FormGroup>
          <FormGroup>
            <Label for="name">
              <strong>Name</strong>
            </Label>
            <Input
              type="text"
              id="name"
              value={this.state.name}
              onChange={event => this.setState({ name: event.target.value })}
              onBlur={() => this.generateBotId()}
            />
            {!!this.state.errorCreateBot && <FormFeedback>{this.state.errorCreateBot.message}</FormFeedback>}
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.createBot}>
            Create
          </Button>
        </ModalFooter>
      </Modal>
    )
  }

  async deleteBot(botId) {
    if (window.confirm("Are you sure you want to delete this bot? This can't be undone.")) {
      await api.getSecured().delete(`/api/teams/${this.props.teamId}/bots/${botId}`)
      await this.props.fetchTeamData(this.props.teamId)
    }
  }

  currentUserHasPermission = (resource, operation) => {
    if (!this.props.currentUserPermissions) {
      return false
    }
    return checkRule(this.props.currentUserPermissions, operation, resource)
  }

  renderEmptyBots() {
    return (
      <div className="bots">
        <Jumbotron>
          <Row>
            <Col style={{ textAlign: 'center' }} sm="12" md={{ size: 8, offset: 2 }}>
              <h1>
                <IoIosBoxOutline />
                &nbsp; This team has no bot, yet.
              </h1>
              <p>In Botpress, bots are always assigned to a team.</p>
            </Col>
          </Row>
        </Jumbotron>
        {this.renderCreateBot()}
      </div>
    )
  }

  renderCreateNewBotButton() {
    return (
      <Row>
        <Col md={{ size: 12 }}>
          <Button
            className="float-right"
            onClick={() => this.setState({ isCreateBotModalOpen: true })}
            color="primary"
            size="sm"
          >
            <MdCreate /> Create Bot Now
          </Button>
        </Col>
      </Row>
    )
  }

  renderBots() {
    const bots = _.orderBy(this.props.bots, ['id'], ['desc'])

    if (!bots.length) {
      return this.renderEmptyBots()
    }

    return (
      <div className="bots">
        {this.renderCreateBot()}
        <ListGroup>
          {bots.map(bot => {
            return (
              <ListGroupItem key={'bot-' + bot.id}>
                <ListGroupItemHeading>
                  <a className="title" href={`/studio/${bot.id}`}>
                    {bot.name}
                  </a>
                </ListGroupItemHeading>
                <div className="list-group-item__actions">
                  <Button color="link" onClick={() => this.deleteBot(bot.id)}>
                    Delete
                  </Button>
                </div>
                <small>{bot.description}</small>
              </ListGroupItem>
            )
          })}
        </ListGroup>
      </div>
    )
  }

  renderSideMenu() {
    return null
  }

  render() {
    if (this.props.loading || !this.props.bots) {
      return this.renderLoading()
    }

    setTimeout(() => {
      jdenticon()
    }, 10)

    const sections = getMenu({
      teamId: this.props.team.id,
      currentPage: 'bots',
      userHasPermission: this.currentUserHasPermission
    })

    return (
      <SectionLayout
        title={`${this.props.team.name}'s bots`}
        helpText="This page lists all the bots created under this team."
        sections={sections}
        license={this.props.license}
        mainContent={this.renderBots()}
        sideMenu={this.renderCreateNewBotButton()}
      />
    )
  }
}

const mapStateToProps = state => ({
  bots: state.teams.bots,
  teamId: state.teams.teamId,
  team: state.teams.team,
  loading: state.teams.loadingTeam,
  currentUserPermissions: state.user.permissions[state.teams.teamId],
  license: state.teams.license
})

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      fetchTeamData,
      fetchPermissions,
      fetchLicense
    },
    dispatch
  )

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Bots)
