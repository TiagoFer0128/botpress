import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'

import {
  fetchFlows,
  switchFlowNode,
  setDiagramAction,
  createFlowNode,
  saveFlow,
  updateFlowNode,
  removeFlowNode,
  createFlow,
  updateFlow
} from '~/actions'

import { getCurrentFlow, getCurrentFlowNode } from '~/reducers'

import Diagram from '../diagram'

const mapStateToProps = (state, ownProps) => ({
  flows: state.flows,
  currentFlow: getCurrentFlow(state),
  currentFlowNode: getCurrentFlowNode(state),
  currentDiagramAction: state.flows.currentDiagramAction
})

const mapDispatchToProps = (dispatch, ownProps) =>
  bindActionCreators(
    {
      fetchFlows: fetchFlows,
      switchFlowNode: switchFlowNode,
      setDiagramAction: setDiagramAction,
      createFlowNode: createFlowNode,
      saveFlow: saveFlow,
      removeFlowNode: removeFlowNode,
      createFlow: createFlow,
      updateFlowNode: updateFlowNode,
      updateFlow: updateFlow
    },
    dispatch
  )

const ConnectedDiagram = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(Diagram)

export default ConnectedDiagram
