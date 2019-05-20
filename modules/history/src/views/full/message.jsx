import React from 'react'
import style from './style.scss'

import { GoX } from 'react-icons/go'
import { MdFileDownload } from 'react-icons/md'
import { FiLink } from 'react-icons/fi'
import { MdSearch } from 'react-icons/md'

import { CopyToClipboard } from 'react-copy-to-clipboard'

import classnames from 'classnames'
import inspectorTheme from './inspectortheme'
import JSONTree from 'react-json-tree'

function MessageGroup(props) {
  const messages = [...props.messages]
  if (!messages) {
    return null
  }

  const userMessageIndex = messages.findIndex(m => m.direction === 'incoming')
  const userMessage = messages[userMessageIndex]
  if (userMessage) {
    messages.splice(userMessageIndex, 1)
  }

  return (
    <div className={style['message-group']}>
      <div className={style['message-group-header']}>
        {userMessage &&
          userMessage.decision && (
            <div className={style['message-group-explanation']}>
              <div className={style['message-group-confidence']}>{`${Math.round(
                userMessage.decision.confidence * 10000
              ) / 100}% decision:`}</div>
              <div className={style['message-group-decision']}>{` ${userMessage.decision.sourceDetails}`}</div>
            </div>
          )}
        <div className={style['message-inspect']} onClick={() => props.focusMessage(userMessage)}>
          <MdSearch />
        </div>
      </div>
      <div className={style['message-sender']}>User:</div>
      {userMessage && (
        <div className={classnames(style['message-elements'], style['message-incomming'])}>{userMessage.preview}</div>
      )}
      <div className={style['message-sender']}>Bot:</div>
      {messages.map(m => {
        return (
          <div
            className={classnames(
              style['message-elements'],
              m.direction === 'outgoing' ? style['message-outgoing'] : style['message-incomming']
            )}
            key={`${m.id}: ${m.direction}`}
            value={m.id}
          >
            {m.preview}
          </div>
        )
      })}
    </div>
  )
}

function NoConversationSelected() {
  return (
    <div className={style['message-list']}>
      <div className={style['no-conv']}>
        <h3>No conversations selected</h3>
        <p>
          Please select a conversation on the left pane to see a message history. If there are no conversations
          available, try talking to your bot and refresh conversations by clicking on the round arrow
        </p>
      </div>
    </div>
  )
}

export class MessagesViewer extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      inspectorIsShown: false,
      currentlyFocusedMessage: null
    }
  }

  getLastMessageDate = messageGroups => {
    const messages = messageGroups.flatMap(m => m)
    const maxDateMessage = _.maxBy(messages, m => m.createdOn)
    return new Date(maxDateMessage.createdOn)
  }

  closeInspector = () => {
    this.setState({ inspectorIsShown: false })
  }

  focusMessage(m) {
    this.setState({ currentlyFocusedMessage: m, inspectorIsShown: true })
  }

  render() {
    if (!this.props.convId || this.props.messageGroups.length <= 0) {
      return <NoConversationSelected />
    }
    return (
      <div className={style['message-viewer']}>
        <div
          className={classnames(
            style['message-list'],
            this.state.inspectorIsShown ? style['message-list-partial'] : style['message-list-full']
          )}
        >
          <div className={style['message-header']}>
            <div>
              {this.props.convId && <div className={style['message-title']}>Conversation #{this.props.convId}</div>}
              {this.props.convId && (
                <div className={style['message-lastdate']}>
                  Last message on : #{this.getLastMessageDate(this.props.messageGroups).toDateString()}
                </div>
              )}
            </div>
            <div className={style['message-header-icons']}>
              <div className={style['message-header-icon_item']}>
                <a
                  href={this.props.fileURL}
                  download="message_history"
                  style={{
                    color: '#233abc'
                  }}
                >
                  <MdFileDownload />
                </a>
              </div>
              <div className={style['message-header-icon_item']}>
                <CopyToClipboard text={window.location.href}>
                  <FiLink />
                </CopyToClipboard>
              </div>
            </div>
          </div>
          {this.props.messageGroups &&
            this.props.messageGroups.map(group => {
              return <MessageGroup key={group[0].id} messages={group} focusMessage={this.focusMessage.bind(this)} />
            })}
        </div>
        <div
          className={classnames(
            style['message-inspector'],
            this.state.inspectorIsShown ? '' : style['message-inspector-hidden']
          )}
        >
          <div className={style['quit-inspector']} onClick={this.closeInspector}>
            <GoX />
          </div>
          {this.state.currentlyFocusedMessage && (
            <JSONTree
              theme={inspectorTheme}
              data={this.state.currentlyFocusedMessage}
              invertTheme={false}
              hideRoot={true}
            />
          )}
        </div>
      </div>
    )
  }
}
