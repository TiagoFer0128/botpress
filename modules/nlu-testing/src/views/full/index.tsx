import { Button, Icon, Spinner } from '@blueprintjs/core'
import { AxiosInstance } from 'axios'
import P from 'bluebird'
import { Container, SplashScreen } from 'botpress/ui'
import _ from 'lodash'
import React from 'react'

import { makeApi, Test, TestResult, XValidationResults } from './api'
import style from './style.scss'
import { CreateTestModal } from './CreateTestModal'
import { CrossValidationResults } from './F1Metrics'
import { TestTable } from './TestTable'

interface State {
  createModalVisible: boolean
  tests: Test[]
  testResults: _.Dictionary<TestResult>
  loading: boolean
  working: boolean
  f1Metrics: XValidationResults
}

interface Props {
  bp: { axios: AxiosInstance }
  contentLang: string
}

// TODO use ctx & useReducer instead of state
export default class NLUTests extends React.Component<Props, State> {
  private api = makeApi(this.props.bp)

  state: State = {
    createModalVisible: false,
    tests: [],
    testResults: {},
    loading: true,
    working: false,
    f1Metrics: null
  }

  setModalVisible(createModalVisible: boolean) {
    this.setState({ createModalVisible })
  }

  async componentDidMount() {
    await this.refreshTests()
  }

  refreshTests = async () => {
    this.api.fetchTests().then(tests => this.setState({ tests, loading: false }))
  }

  runTests = async () => {
    this.setState({ working: true })
    const testResults = (await P.mapSeries(this.state.tests, this.api.runTest)).reduce((resultsMap, result) => {
      return { ...resultsMap, [result.id]: result }
    }, {})
    this.setState({ testResults, working: false })
  }

  computeXValidation = async () => {
    this.setState({ working: true })
    const f1Metrics = await this.api.computeCrossValidation(this.props.contentLang)
    this.setState({ f1Metrics, working: false })
  }

  render() {
    const shouldRenderSplash = !this.state.loading && !this.state.tests.length && !this.state.f1Metrics
    return (
      <Container sidePanelHidden={true}>
        <div />
        <div className="bph-layout-main">
          <div className="bph-layout-middle">
            <div className={style.toolbar}>
              {!this.state.tests.length && (
                <Button
                  intent="success"
                  minimal
                  small
                  icon="add"
                  text="Create your first test"
                  onClick={this.setModalVisible.bind(this, true)}
                />
              )}
              {!!this.state.tests.length && (
                <Button intent="primary" minimal icon="play" text="Run tests" onClick={() => this.runTests()} />
              )}
              <Button
                intent="primary"
                minimal
                icon="function"
                onClick={() => this.computeXValidation()}
                text="Run Cross Validation"
              />
              {this.state.working && (
                <span className={style.working}>
                  <Spinner size={20} />
                  &nbsp; Working
                </span>
              )}
            </div>
            <div className={style.container}>
              {shouldRenderSplash && (
                <SplashScreen
                  icon={<Icon iconSize={100} icon="predictive-analysis" style={{ marginBottom: '3em' }} />}
                  title="NLU Regression Testing"
                  description="Utility module used by the Botpress team to perform regression testing on native NLU"
                />
              )}
              {!!this.state.tests.length && (
                <TestTable
                  tests={this.state.tests}
                  testResults={this.state.testResults}
                  createTest={this.setModalVisible.bind(this, true)}
                />
              )}
              <CrossValidationResults f1Metrics={this.state.f1Metrics} />
              <CreateTestModal
                api={this.api}
                hide={this.setModalVisible.bind(this, false)}
                visible={this.state.createModalVisible}
                onTestCreated={() => this.refreshTests()}
              />
            </div>
          </div>
        </div>
      </Container>
    )
  }
}
