import { Button, ButtonGroup, Intent } from '@blueprintjs/core'
import { AxiosStatic } from 'axios'
import React from 'react'

import { ApiFlaggedEvent, RESOLUTION_TYPE } from '../../../types'
import StickyActionBar from '../StickyActionBar'

import style from './style.scss'
import IntentPicker from './IntentPicker'
import QnAPicker from './QnAPicker'

interface Props {
  axios: AxiosStatic
  language: string
  event: ApiFlaggedEvent
  mode: RESOLUTION_TYPE
  resolution: string | null
  resolutionParams: object | null
  setMode: (mode: RESOLUTION_TYPE) => void
  onSelect: (resolution: string | null) => void
  onParamsUpdate: (resolutionParams: object | null) => void
  onSave: () => void
  onCancel: () => void
}

const AmendForm = ({
  axios,
  language,
  event,
  mode,
  setMode,
  resolution,
  resolutionParams,
  onSelect,
  onParamsUpdate,
  onSave,
  onCancel
}: Props) => (
  <div className={style.amendForm}>
    <h4>
      What is this message type?
      <br />
      <ButtonGroup className={style.messageTypeBtnGroup}>
        <Button
          disabled={mode !== RESOLUTION_TYPE.intent && !!resolution}
          onClick={() => {
            if (mode === RESOLUTION_TYPE.intent) {
              return
            }
            setMode(RESOLUTION_TYPE.intent)
          }}
          intent={mode === RESOLUTION_TYPE.intent ? Intent.SUCCESS : Intent.NONE}
        >
          Goal
        </Button>
        <Button
          disabled={mode !== RESOLUTION_TYPE.qna && !!resolution}
          onClick={() => {
            if (mode === RESOLUTION_TYPE.qna) {
              return
            }
            setMode(RESOLUTION_TYPE.qna)
          }}
          intent={mode === RESOLUTION_TYPE.qna ? Intent.SUCCESS : Intent.NONE}
        >
          Query
        </Button>
        {mode != null && (
          <Button
            onClick={() => {
              setMode(null)
              onSelect(null)
            }}
            icon="undo"
          >
            Undo
          </Button>
        )}
      </ButtonGroup>
    </h4>

    {mode === RESOLUTION_TYPE.qna && (
      <div className={style.amendFormPicker}>
        <QnAPicker axios={axios} language={language} selected={resolution} onSelect={onSelect} />
      </div>
    )}

    {mode === RESOLUTION_TYPE.intent && (
      <div className={style.amendFormPicker}>
        <IntentPicker
          axios={axios}
          language={language}
          event={event}
          selected={resolution}
          params={resolutionParams}
          onSelect={onSelect}
          onParamsUpdate={onParamsUpdate}
        />
      </div>
    )}

    <StickyActionBar>
      <Button onClick={onCancel} icon="cross" intent={Intent.NONE}>
        Cancel
      </Button>
      <Button onClick={onSave} icon="tick" intent={Intent.SUCCESS} disabled={!mode || !resolution}>
        Save
      </Button>
    </StickyActionBar>
  </div>
)

export default AmendForm
