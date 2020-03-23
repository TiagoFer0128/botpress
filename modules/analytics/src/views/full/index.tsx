import { Button, HTMLSelect, IconName, MaybeElement, Popover, Position, Tooltip as BpTooltip } from '@blueprintjs/core'
import { DateRange, DateRangeInput, DateRangePicker, IDateRangeShortcut, TimePrecision } from '@blueprintjs/datetime'
import '@blueprintjs/datetime/lib/css/blueprint-datetime.css'
import axios from 'axios'
import { lang } from 'botpress/shared'
import cx from 'classnames'
import _ from 'lodash'
import moment from 'moment'
import React, { FC, useEffect, useState } from 'react'

import { MetricEntry } from '../../backend/typings'
import { initializeTranslations } from '../translations'

import {
  lastMonthEnd,
  lastMonthStart,
  lastWeekEnd,
  lastWeekStart,
  lastYearEnd,
  lastYearStart,
  now,
  thisMonth,
  thisWeek,
  thisYear
} from './dates'
import style from './style.scss'
import FlatProgressChart from './FlatProgressChart'
import ItemsList from './ItemsList'
import NumberMetric from './NumberMetric'
import RadialMetric from './RadialMetric'
import TimeSeriesChart from './TimeSeriesChart'

interface State {
  metrics: MetricEntry[]
  dateRange?: DateRange
  pageTitle: string
  selectedChannel: string
  shownSection: string
}

export interface Extras {
  icon?: IconName | MaybeElement
  iconBottom?: IconName | MaybeElement
  className?: string
}

const navigateToElement = (name: string, type: string) => () => {
  let url
  if (type === 'qna') {
    url = `/modules/qna?id=${name.replace('__qna__', '')}`
  } else if (type === 'workflow') {
    url = `/oneflow/${name}`
  }
  window.postMessage({ action: 'navigate-url', payload: url }, '*')
}

const fetchReducer = (state: State, action): State => {
  if (action.type === 'datesSuccess') {
    const { dateRange } = action.data

    return {
      ...state,
      dateRange
    }
  } else if (action.type === 'receivedMetrics') {
    const { metrics } = action.data

    return {
      ...state,
      metrics
    }
  } else if (action.type === 'channelSuccess') {
    const { selectedChannel } = action.data

    return {
      ...state,
      selectedChannel
    }
  } else if (action.type === 'sectionChange') {
    const { shownSection, pageTitle } = action.data

    return {
      ...state,
      shownSection,
      pageTitle
    }
  } else {
    throw new Error(`That action type isn't supported.`)
  }
}

initializeTranslations()

const Analytics: FC<any> = ({ bp }) => {
  const [channels, setChannels] = useState([lang.tr('analytics.channels.all'), lang.tr('analytics.channels.api')])

  const [state, dispatch] = React.useReducer(fetchReducer, {
    dateRange: undefined,
    metrics: [],
    pageTitle: lang.tr('analytics.dashboard'),
    selectedChannel: 'all',
    shownSection: 'dashboard'
  })

  useEffect(() => {
    void axios.get(`${window.origin + window['API_PATH']}/modules`).then(({ data }) => {
      const channels = data
        .map(x => x.name)
        .filter(x => x.startsWith('channel'))
        .map(x => x.replace('channel-', ''))

      setChannels(prevState => [...prevState, ...channels])
    })

    dispatch({ type: 'datesSuccess', data: { dateRange: [thisWeek, now] } })
  }, [])

  useEffect(() => {
    if (!state.dateRange?.[0] || !state.dateRange?.[1]) {
      return
    }

    // tslint:disable-next-line: no-floating-promises
    fetchAnalytics(state.selectedChannel, state.dateRange).then(metrics => {
      dispatch({ type: 'receivedMetrics', data: { dateRange: state.dateRange, metrics } })
    })
  }, [state.dateRange, state.selectedChannel])

  const fetchAnalytics = async (channel, dateRange): Promise<MetricEntry[]> => {
    const startDate = moment(dateRange[0]).unix()
    const endDate = moment(dateRange[1]).unix()

    const { data } = await bp.axios.get(`mod/analytics/channel/${channel}`, {
      params: {
        start: startDate,
        end: endDate
      }
    })
    return data.metrics
  }

  const handleChannelChange = async ({ target: { value: selectedChannel } }) => {
    dispatch({ type: 'channelSuccess', data: { selectedChannel } })
  }

  const handleDateChange = async (dateRange: DateRange) => {
    dispatch({ type: 'datesSuccess', data: { dateRange } })
  }

  const isLoaded = () => {
    return state.metrics && state.dateRange
  }

  const capitalize = str => str.substring(0, 1).toUpperCase() + str.substring(1)

  const getMetricCount = (metricName: string, subMetric?: string) => {
    const metrics = state.metrics.filter(m => m.metric === metricName && (!subMetric || m.subMetric === subMetric))
    return _.sumBy(metrics, 'value')
  }

  const getAvgMsgPerSessions = () => {
    const sentCount = state.metrics.reduce((acc, m) => (m.metric === 'msg_sent_count' ? acc + m.value : acc), 0)
    const receivedCount = state.metrics.reduce((acc, m) => (m.metric === 'msg_received_count' ? acc + m.value : acc), 0)

    return sentCount + receivedCount
  }

  const getUnderstoodPercent = () => {
    const received = getMetricCount('msg_received_count')
    const none = getMetricCount('msg_nlu_intent', 'none')
    const percent = ((received - none) / received) * 100

    return getNotNaN(percent, '%')
  }

  const getTopLevelUnderstoodPercent = () => {
    const received = getMetricCount('msg_received_count')
    const none = getMetricCount('top_msg_nlu_none')
    const percent = ((received - none) / received) * 100

    return getNotNaN(percent, '%')
  }

  const getReturningUsers = () => {
    const activeUsersCount = getMetricCount('active_users_count')
    const newUsersCount = getMetricCount('new_users_count')
    const percent = activeUsersCount && (newUsersCount / activeUsersCount) * 100

    return getNotNaN(percent, '%')
  }

  const getNewUsersPercent = () => {
    const existingUsersCount = 150 // TODO get this number from database
    const newUsersCount = getMetricCount('new_users_count')
    const percent = newUsersCount && (existingUsersCount / newUsersCount) * 100

    return getNotNaN(percent, '%')
  }

  const getNotNaN = (value, suffix = '') => (Number.isNaN(value) ? 'N/A' : `${Math.round(value)}${suffix}`)

  const getMetric = metricName => state.metrics.filter(x => x.metric === metricName)

  const getTopItems = (metricName: string, type: string) => {
    const grouped = _.groupBy(getMetric(metricName), 'subMetric')
    const results = _.orderBy(
      Object.keys(grouped).map(x => ({ name: x, count: _.sumBy(grouped[x], 'value') })),
      x => x.count,
      'desc'
    )

    return results.map(x => ({
      label: `${x.name} (${x.count})`,
      href: '',
      onClick: navigateToElement(x.name, type)
    }))
  }

  const renderEngagement = () => {
    return (
      <div className={style.metricsContainer}>
        <NumberMetric
          name={lang.tr('analytics.activeUsers')}
          value={getMetricCount('active_users_count')}
          icon="user"
        />
        <NumberMetric
          name={lang.tr('analytics.newUsers', { nb: getMetricCount('new_users_count') })}
          value={getNewUsersPercent()}
          icon="trending-down"
        />
        <NumberMetric
          name={lang.tr('analytics.returningUsers', { nb: getMetricCount('active_users_count') })}
          value={getReturningUsers()}
          icon="trending-up"
        />
        <TimeSeriesChart
          name={lang.tr('analytics.userActivities')}
          data={getMetric('new_users_count')}
          className={style.fullGrid}
          channels={channels}
        />
      </div>
    )
  }

  const renderConversations = () => {
    return (
      <div className={style.metricsContainer}>
        <TimeSeriesChart
          name="Sessions"
          data={getMetric('sessions_count')}
          className={style.threeQuarterGrid}
          channels={channels}
        />
        <NumberMetric name={lang.tr('analytics.messageExchanged')} value={getAvgMsgPerSessions()} iconBottom="chat" />
        <NumberMetric
          name={lang.tr('analytics.workflowsInitiated')}
          value={getMetricCount('workflow_started_count')}
          className={style.half}
        />
        <NumberMetric
          name={lang.tr('analytics.questionsAsked')}
          value={getMetricCount('msg_sent_qna_count')}
          className={style.half}
        />
        <ItemsList
          name={lang.tr('analytics.mostUsedWorkflows')}
          items={getTopItems('enter_flow_count', 'workflow')}
          itemLimit={10}
          className={cx(style.genericMetric, style.half, style.list)}
        />
        <ItemsList
          name={lang.tr('analytics.mostAskedQuestions')}
          items={getTopItems('msg_sent_qna_count', 'qna')}
          itemLimit={10}
          hasTooltip
          className={cx(style.genericMetric, style.half, style.list)}
        />
      </div>
    )
  }

  const renderHandlingUnderstanding = () => {
    return (
      <div className={cx(style.metricsContainer, style.fullWidth)}>
        <div className={cx(style.genericMetric, style.quarter)}>
          <div>
            <p className={style.numberMetricValue}>{getMetricCount('msg_nlu_intent', 'none')}</p>
            <h3 className={style.metricName}>{lang.tr('analytics.misunderstoodMessages')}</h3>
          </div>
          <div>
            <FlatProgressChart value="70%" color="#DE4343" name="70% inside flows" />
            <FlatProgressChart value="30%" color="#F2B824" name="30% outside flows" />
          </div>
        </div>
        <div className={cx(style.genericMetric, style.quarter, style.list, style.multiple)}>
          <ItemsList
            name={lang.tr('analytics.mostFailedWorkflows')}
            items={getTopItems('workflow_failed_count', 'workflow')}
            itemLimit={3}
            className={style.list}
          />
          <ItemsList
            name={lang.tr('analytics.mostFailedQuestions')}
            items={getTopItems('feedback_negative_qna', 'qna')}
            itemLimit={3}
            hasTooltip
            className={style.list}
          />
        </div>
        <RadialMetric
          name={lang.tr('analytics.successfulWorkflowCompletions', { nb: getMetricCount('workflow_completed_count') })}
          value={getMetricCount('workflow_completed_count')}
          className={style.quarter}
        />
        <RadialMetric
          name={lang.tr('analytics.positiveQnaFeedback', { nb: getMetricCount('feedback_positive_qna') })}
          value={getMetricCount('feedback_positive_qna')}
          className={style.quarter}
        />
      </div>
    )
  }

  if (!isLoaded()) {
    return null
  }

  const shortcuts: IDateRangeShortcut[] = [
    {
      dateRange: [thisWeek, now],
      label: lang.tr('analytics.timespan.thisWeek')
    },
    {
      dateRange: [lastWeekStart, lastWeekEnd],
      label: lang.tr('analytics.timespan.lastWeek')
    },
    {
      dateRange: [thisMonth, now],
      label: lang.tr('analytics.timespan.thisMonth')
    },
    {
      dateRange: [lastMonthStart, lastMonthEnd],
      label: lang.tr('analytics.timespan.lastMonth')
    },
    {
      dateRange: [thisYear, now],
      label: lang.tr('analytics.timespan.thisYear')
    },
    {
      dateRange: [lastYearStart, lastYearEnd],
      label: lang.tr('analytics.timespan.lastYear')
    }
  ]

  return (
    <div className={style.mainWrapper}>
      <div className={style.innerWrapper}>
        <div className={style.header}>
          <h1 className={style.pageTitle}>{lang.tr('analytics.title')}</h1>
          <div className={style.filters}>
            <BpTooltip content={lang.tr('analytics.filterChannels')} position={Position.LEFT}>
              <HTMLSelect className={style.filterItem} onChange={handleChannelChange} value={state.selectedChannel}>
                {channels.map(channel => {
                  return (
                    <option key={channel} value={channel}>
                      {capitalize(channel)}
                    </option>
                  )
                })}
              </HTMLSelect>
            </BpTooltip>

            <Popover>
              <Button icon="calendar" className={style.filterItem}>
                {lang.tr('analytics.dateRange')}
              </Button>
              <DateRangePicker
                onChange={handleDateChange}
                allowSingleDayRange={true}
                shortcuts={shortcuts}
                maxDate={new Date()}
                value={state.dateRange}
              />
            </Popover>
          </div>
        </div>
        <div className={style.sectionsWrapper}>
          <div className={cx(style.section, style.half)}>
            <h2>{lang.tr('analytics.engagement')}</h2>
            {renderEngagement()}
          </div>
          <div className={cx(style.section, style.half)}>
            <h2>{lang.tr('analytics.conversations')}</h2>
            {renderConversations()}
          </div>
          <div className={style.section}>
            <h2>{lang.tr('analytics.handlingAndUnderstanding')}</h2>
            {renderHandlingUnderstanding()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
