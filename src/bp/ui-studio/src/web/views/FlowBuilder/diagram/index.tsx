import {
  Button,
  ContextMenu,
  ControlGroup,
  Icon,
  InputGroup,
  Intent,
  Menu,
  MenuDivider,
  MenuItem,
  Position,
  Tag,
  Toaster
} from '@blueprintjs/core'
import _ from 'lodash'
import React, { Component, Fragment } from 'react'
import ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import { DiagramEngine, DiagramWidget, NodeModel } from 'storm-react-diagrams'
import {
  buildNewSkill,
  closeFlowNodeProps,
  copyFlowNode,
  createFlow,
  createFlowNode,
  fetchFlows,
  insertNewSkillNode,
  openFlowNodeProps,
  pasteFlowNode,
  removeFlowNode,
  setDiagramAction,
  switchFlow,
  switchFlowNode,
  updateFlow,
  updateFlowNode,
  updateFlowProblems
} from '~/actions'
import { Timeout, toastInfo } from '~/components/Shared/Utils'
import { getCurrentFlow, getCurrentFlowNode } from '~/reducers'

import { SkillDefinition } from '../sidePanel/FlowTools'

import { defaultTransition, DIAGRAM_PADDING, DiagramManager, nodeTypes } from './manager'
import { DeletableLinkFactory } from './nodes/LinkWidget'
import { SkillCallNodeModel, SkillCallWidgetFactory } from './nodes/SkillCallNode'
import { StandardNodeModel, StandardWidgetFactory } from './nodes/StandardNode'
import { ExecuteWidgetFactory } from './nodes_v2/ExecuteNode'
import { ListenWidgetFactory } from './nodes_v2/ListenNode'
import { RouterNodeModel, RouterWidgetFactory } from './nodes_v2/RouterNode'
import { SaySomethingWidgetFactory } from './nodes_v2/SaySomethingNode'
import style from './style.scss'

class Diagram extends Component<Props> {
  private diagramEngine: ExtendedDiagramEngine
  private diagramWidget: DiagramWidget
  private diagramContainer: HTMLDivElement
  private manager: DiagramManager

  state = {
    highlightFilter: ''
  }

  constructor(props) {
    super(props)

    this.diagramEngine = new DiagramEngine()
    this.diagramEngine.registerNodeFactory(new StandardWidgetFactory())
    this.diagramEngine.registerNodeFactory(new SkillCallWidgetFactory(this.props.skills))
    this.diagramEngine.registerNodeFactory(new SaySomethingWidgetFactory())
    this.diagramEngine.registerNodeFactory(new ExecuteWidgetFactory())
    this.diagramEngine.registerNodeFactory(new ListenWidgetFactory())
    this.diagramEngine.registerNodeFactory(new RouterWidgetFactory())
    this.diagramEngine.registerLinkFactory(new DeletableLinkFactory())

    // This reference allows us to update flow nodes from widgets
    this.diagramEngine.flowBuilder = this
    this.manager = new DiagramManager(this.diagramEngine, { switchFlowNode: this.props.switchFlowNode })

    // @ts-ignore
    window.highlightNode = (flowName: string, nodeName: string) => {
      this.manager.setHighlightedNodes(nodeName)

      if (!flowName || !nodeName) {
        // Refreshing the model anyway, to remove the highlight if node is undefined
        this.manager.syncModel()
        return
      }

      try {
        if (this.props.currentFlow.name !== flowName) {
          this.props.switchFlow(flowName)
        } else {
          this.manager.syncModel()
        }
      } catch (err) {
        console.error('Error when switching flow or refreshing', err)
      }
    }
  }

  componentDidMount() {
    this.props.fetchFlows()
    ReactDOM.findDOMNode(this.diagramWidget).addEventListener('click', this.onDiagramClick)
    ReactDOM.findDOMNode(this.diagramWidget).addEventListener('dblclick', this.onDiagramDoubleClick)
    document.getElementById('diagramContainer').addEventListener('keydown', this.onKeyDown)
  }

  componentWillUnmount() {
    ReactDOM.findDOMNode(this.diagramWidget).removeEventListener('click', this.onDiagramClick)
    ReactDOM.findDOMNode(this.diagramWidget).removeEventListener('dblclick', this.onDiagramDoubleClick)
    document.getElementById('diagramContainer').removeEventListener('keydown', this.onKeyDown)
  }

  componentDidUpdate(prevProps, prevState) {
    this.manager.setCurrentFlow(this.props.currentFlow)
    this.manager.setReadOnly(this.props.readOnly)

    if (this.diagramContainer) {
      this.manager.setDiagramContainer(this.diagramWidget, {
        width: this.diagramContainer.offsetWidth,
        height: this.diagramContainer.offsetHeight
      })
    }

    const isDifferentFlow = _.get(prevProps, 'currentFlow.name') !== _.get(this, 'props.currentFlow.name')

    if (!this.props.currentFlow) {
      this.manager.clearModel()
    } else if (!prevProps.currentFlow || isDifferentFlow) {
      // Update the diagram model only if we changed the current flow
      this.manager.initializeModel()
      this.checkForProblems()
    } else {
      // Update the current model with the new properties
      this.manager.syncModel()
    }

    // Refresh nodes when the filter is updated
    if (this.state.highlightFilter !== prevState.highlightFilter) {
      this.manager.setHighlightedNodes(this.state.highlightFilter)
      this.manager.syncModel()
    }

    // Clear nodes when search field is hidden
    if (!this.props.showSearch && prevProps.showSearch) {
      this.manager.setHighlightedNodes([])
      this.manager.syncModel()
    }

    // Reset search when toggled
    if (this.props.showSearch && !prevProps.showSearch) {
      this.setState({ highlightFilter: '' })
    }
  }

  handleContextMenuNoElement = (event: React.MouseEvent) => {
    const { x, y } = this.manager.getRealPosition(event)
    const addFlowNode = () => {
      this.props.createFlowNode({ x, y, type: 'standard' })
    }
    const addSkillNode = (id: string) => {
      this.props.buildSkill({ location: { x, y }, id })
    }
    const addSayNode = () => {
      this.props.createFlowNode({ x, y, type: 'say_something', next: [defaultTransition] })
    }
    const addExecuteNode = () => {
      this.props.createFlowNode({ x, y, type: 'execute', next: [defaultTransition] })
    }
    const addListenNode = () => {
      this.props.createFlowNode({ x, y, type: 'listen', onReceive: [], next: [defaultTransition] })
    }
    const addRouterNode = () => {
      this.props.createFlowNode({ x, y, type: 'router' })
    }
    ContextMenu.show(
      <Menu>
        <MenuDivider title="Add Node" />
        <MenuItem text="Standard Node" onClick={addFlowNode} icon="chat" />
        {this.props.flowPreview ? (
          <React.Fragment>
            <MenuItem text="Say" onClick={addSayNode} icon="comment" />
            <MenuItem text="Execute" onClick={addExecuteNode} icon="code-block" />
            <MenuItem text="Listen" onClick={addListenNode} icon="hand" />
            <MenuItem text="Router" onClick={addRouterNode} icon="search-around" />
          </React.Fragment>
        ) : null}
        <MenuItem text="Skills" icon="add">
          {this.props.skills.map(skill => (
            <MenuItem
              text={skill.name}
              onClick={() => {
                addSkillNode(skill.id)
              }}
              icon={skill.icon}
            >
            </MenuItem>
          ))}
        </MenuItem>
      </Menu>,
      { left: event.clientX, top: event.clientY }
    )
  }

  handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()

    const target = this.diagramWidget.getMouseElement(event)
    if (!target) {
      this.handleContextMenuNoElement(event)
      return
    }

    const targetModel = target && target.model
    const targetName = _.get(target, 'model.name')
    const flowPosition = this.manager.getRealPosition(event)

    const canMakeStartNode = () => {
      const current = this.props.currentFlow && this.props.currentFlow.startNode
      return current && targetName && current !== targetName
    }

    const setAsCurrentNode = () => this.props.updateFlow({ startNode: targetName })
    const isStartNode = targetName === this.props.currentFlow.startNode
    const isNodeTargeted = targetModel instanceof NodeModel

    // Prevents displaying an empty menu
    if ((!isNodeTargeted && !this.props.canPasteNode) || this.props.readOnly) {
      return
    }

    const canAddChipToTarget = this._canAddTransitionChipToTarget(target)
    console.log(canAddChipToTarget)

    const addTransitionNode = async () => {
      await this._addTransitionChipToRouter(target)
    }

    ContextMenu.show(
      <Menu>
        {!isNodeTargeted && this.props.canPasteNode && (
          <MenuItem icon="clipboard" text="Paste" onClick={() => this.pasteElementFromBuffer(flowPosition)} />
        )}
        {isNodeTargeted && (
          <Fragment>
            <MenuItem icon="trash" text="Delete" disabled={isStartNode} onClick={() => this.deleteSelectedElements()} />
            <MenuItem
              icon="duplicate"
              text="Copy"
              onClick={() => {
                this.props.switchFlowNode(targetModel.id)
                this.copySelectedElementToBuffer()
              }}
            />
            <MenuDivider />
            <MenuItem
              icon="star"
              text="Set as Start Node"
              disabled={!canMakeStartNode()}
              onClick={() => setAsCurrentNode()}
            />
            <MenuItem
              icon="minimize"
              text="Disconnect Node"
              onClick={() => {
                this.manager.disconnectPorts(target)
                this.checkForLinksUpdate()
              }}
            />
            {this.props.flowPreview && canAddChipToTarget ? (
              <React.Fragment>
                <MenuDivider />
                <MenuItem text="Chips">
                  <MenuItem text="Transition" onClick={addTransitionNode} icon="flow-end" />
                </MenuItem>
              </React.Fragment>
            ) : null}
          </Fragment>
        )}
      </Menu>,
      { left: event.clientX, top: event.clientY }
    )
  }

  checkForProblems() {
    this.props.updateFlowProblems(this.manager.getNodeProblems())
  }

  createFlow(name: string) {
    this.props.createFlow(name + '.flow.json')
  }

  onDiagramDoubleClick = (event?: MouseEvent) => {
    if (event) {
      // We only keep 3 events for dbl click: full flow, standard nodes and skills. Adding temporarily router so it's editable
      const target = this.diagramWidget.getMouseElement(event)
      if (
        target &&
        !(
          target.model instanceof StandardNodeModel ||
          target.model instanceof SkillCallNodeModel ||
          target.model instanceof RouterNodeModel
        )
      ) {
        return
      }
    }

    // TODO: delete this once 12.2.1 is out
    toastInfo('Pssst! Just click once a node to inspect it, no need to double-click anymore.', Timeout.LONG)
  }

  canTargetOpenInspector = target => {
    if (!target) {
      return false
    }

    const targetModel = target.model
    return (
      targetModel instanceof StandardNodeModel ||
      targetModel instanceof SkillCallNodeModel ||
      target.model instanceof RouterNodeModel
    )
  }

  onDiagramClick = (event: MouseEvent) => {
    const selectedNode = this.manager.getSelectedNode() as BpNodeModel
    const currentNode = this.props.currentFlowNode
    const target = this.diagramWidget.getMouseElement(event)

    this.manager.sanitizeLinks()
    this.manager.cleanPortLinks()

    this.canTargetOpenInspector(target) ? this.props.openFlowNodeProps() : this.props.closeFlowNodeProps()

    if (!selectedNode) {
      this.props.closeFlowNodeProps()
      this.props.switchFlowNode(null)
    } else if (selectedNode && (!currentNode || selectedNode.id !== currentNode.id)) {
      // Different node selected
      this.props.switchFlowNode(selectedNode.id)
    }

    if (selectedNode && (selectedNode.oldX !== selectedNode.x || selectedNode.oldY !== selectedNode.y)) {
      this.props.updateFlowNode({ x: selectedNode.x, y: selectedNode.y })
      Object.assign(selectedNode, { oldX: selectedNode.x, oldY: selectedNode.y })
    }

    this.checkForLinksUpdate()
  }

  checkForLinksUpdate() {
    const links = this.manager.getLinksRequiringUpdate()
    if (links) {
      this.props.updateFlow({ links })
    }

    this.checkForProblems()
  }

  deleteSelectedElements() {
    const elements = _.sortBy(this.diagramEngine.getDiagramModel().getSelectedItems(), 'nodeType')

    // Use sorting to make the nodes first in the array, deleting the node before the links
    for (const element of elements) {
      if (!this.diagramEngine.isModelLocked(element)) {
        if (element['isStartNode']) {
          return alert("You can't delete the start node.")
        } else if (
          // @ts-ignore
          _.includes(nodeTypes, element.nodeType) ||
          _.includes(nodeTypes, element.type)
        ) {
          this.props.removeFlowNode(element.id)
        } else if (element.type === 'default') {
          element.remove()
          this.checkForLinksUpdate()
        } else {
          element.remove() // it's a point or something else
        }
      }
    }

    this.diagramWidget.forceUpdate()
    this.checkForProblems()
  }

  copySelectedElementToBuffer() {
    this.props.copyFlowNode()
    Toaster.create({
      className: 'recipe-toaster',
      position: Position.TOP_RIGHT
    }).show({ message: 'Copied to buffer' })
  }

  pasteElementFromBuffer(position?) {
    if (position) {
      this.props.pasteFlowNode(position)
    } else {
      const { offsetX, offsetY } = this.manager.getActiveModelOffset()
      this.props.pasteFlowNode({ x: -offsetX + DIAGRAM_PADDING, y: -offsetY + DIAGRAM_PADDING })
    }

    this.manager.unselectAllElements()
  }

  onKeyDown = event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      this.copySelectedElementToBuffer()
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
      this.pasteElementFromBuffer()
    } else if (event.code === 'Backspace' || event.code === 'Delete') {
      this.deleteSelectedElements()
    }
  }

  handleFlowWideClicked = () => {
    this.props.switchFlowNode(null)
    this.props.openFlowNodeProps()
  }

  handleFilterChanged = event => {
    this.setState({ highlightFilter: event.target.value })
  }

  renderCatchAllInfo() {
    const nbNext = _.get(this.props.currentFlow, 'catchAll.next.length', 0)
    const nbReceive = _.get(this.props.currentFlow, 'catchAll.onReceive.length', 0)

    return (
      <div style={{ display: 'flex', marginTop: 5 }}>
        <Button onClick={this.handleFlowWideClicked} minimal={true}>
          <Tag intent={nbNext > 0 ? Intent.PRIMARY : Intent.NONE}>{nbNext}</Tag> flow-wide
          {nbNext === 1 ? ' transition' : ' transitions'}
        </Button>
        <Button onClick={this.handleFlowWideClicked} minimal={true}>
          <Tag intent={nbReceive > 0 ? Intent.PRIMARY : Intent.NONE}>{nbReceive}</Tag> flow-wide
          {nbReceive === 1 ? ' on receive' : ' on receives'}
        </Button>
        {this.props.showSearch && (
          <ControlGroup>
            <InputGroup
              id="input-highlight-name"
              tabIndex={1}
              placeholder="Highlight nodes by name"
              value={this.state.highlightFilter}
              onChange={this.handleFilterChanged}
              autoFocus={true}
            />
            <Button icon="small-cross" onClick={this.props.hideSearch} />
          </ControlGroup>
        )}
      </div>
    )
  }

  handleToolDropped = async (event: React.DragEvent) => {
    if (this.props.readOnly) {
      return
    }

    this.manager.unselectAllElements()
    const data = JSON.parse(event.dataTransfer.getData('diagram-node'))

    const { x, y } = this.manager.getRealPosition(event)

    if (data.type === 'chip') {
      const target = this.diagramWidget.getMouseElement(event)
      if (this._canAddTransitionChipToTarget(target)) {
        await this._addTransitionChipToRouter(target)
      }
    } else if (data.type === 'skill') {
      this.props.buildSkill({ location: { x, y }, id: data.id })
    } else if (data.type === 'node') {
      // The following nodes needs default transitions
      if (data.id === 'say_something' || data.id === 'execute') {
        this.props.createFlowNode({ x, y, type: data.id, next: [defaultTransition] })
      } else if (data.id === 'listen') {
        this.props.createFlowNode({ x, y, type: data.id, onReceive: [], next: [defaultTransition] })
      } else {
        this.props.createFlowNode({ x, y, type: data.id })
      }
    }
  }

  private async _addTransitionChipToRouter(target) {
    await this.props.switchFlowNode(target.model.id)
    this.props.updateFlowNode({ next: [...this.props.currentFlowNode.next, defaultTransition] })
  }

  private _canAddTransitionChipToTarget(target): boolean {
    if (this.props.readOnly) {
      return false
    }

    return target && target.model instanceof RouterNodeModel
  }

  render() {
    return (
      <div
        id="diagramContainer"
        ref={ref => (this.diagramContainer = ref)}
        tabIndex={1}
        style={{ outline: 'none', width: '100%', height: '100%' }}
        onContextMenu={this.handleContextMenu}
        onDrop={this.handleToolDropped}
        onDragOver={event => event.preventDefault()}
      >
        <div className={style.floatingInfo}>{this.renderCatchAllInfo()}</div>

        <DiagramWidget
          ref={w => (this.diagramWidget = w)}
          deleteKeys={[]}
          diagramEngine={this.diagramEngine}
          inverseZoom={true}
        />
      </div>
    )
  }
}

interface Props {
  currentFlow: any
  switchFlow: (flowName: string) => void
  switchFlowNode: (nodeId: string) => any
  updateFlowProblems: (problems: NodeProblem[]) => void
  openFlowNodeProps: () => void
  closeFlowNodeProps: () => void
  updateFlow: any
  createFlowNode: (props: any) => void
  createFlow: (name: string) => void
  insertNewSkillNode: any
  updateFlowNode: any
  fetchFlows: any
  setDiagramAction: any
  pasteFlowNode: ({ x, y }) => void
  currentDiagramAction: any
  copyFlowNode: () => void
  currentFlowNode: any
  removeFlowNode: any
  buildSkill: any
  readOnly: boolean
  canPasteNode: boolean
  flowPreview: boolean
  showSearch: boolean
  hideSearch: () => void
  skills: SkillDefinition[]
}

interface NodeProblem {
  nodeName: string
  missingPorts: any
}

type BpNodeModel = StandardNodeModel | SkillCallNodeModel

type ExtendedDiagramEngine = {
  enableLinkPoints?: boolean
  flowBuilder?: any
} & DiagramEngine

const mapStateToProps = state => ({
  flows: state.flows,
  currentFlow: getCurrentFlow(state),
  currentFlowNode: getCurrentFlowNode(state),
  currentDiagramAction: state.flows.currentDiagramAction,
  canPasteNode: Boolean(state.flows.nodeInBuffer),
  skills: state.skills.installed
})

const mapDispatchToProps = {
  fetchFlows,
  switchFlowNode,
  openFlowNodeProps,
  closeFlowNodeProps,
  setDiagramAction,
  createFlowNode,
  removeFlowNode,
  createFlow,
  updateFlowNode,
  switchFlow,
  updateFlow,
  copyFlowNode,
  pasteFlowNode,
  insertNewSkillNode,
  updateFlowProblems,
  buildSkill: buildNewSkill
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { withRef: true }
)(Diagram)
