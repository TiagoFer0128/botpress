import { Button, Callout, Classes, Dialog, FileInput, FormGroup, Intent, Radio, RadioGroup } from '@blueprintjs/core'
import 'bluebird-global'
import _ from 'lodash'
import React, { FC, Fragment, useEffect, useState } from 'react'

import { toastFailure, toastSuccess } from './toaster'

const JSON_STATUS_POLL_INTERVAL = 1000
const axiosConfig = { headers: { 'Content-Type': 'multipart/form-data' } }

interface Props {
  axios: any
  onImportCompleted: () => void
}

interface Summary {
  qnaCount: number
  cmsCount: number
  fileQnaCount: number
  fileCmsCount: number
}

export const ImportModal: FC<Props> = props => {
  const [file, setFile] = useState<any>()
  const [filePath, setFilePath] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [importAction, setImportAction] = useState('insert')
  const [summary, setSummary] = useState<Summary>()
  const [statusId, setStatusId] = useState<string>()
  const [uploadStatus, setUploadStatus] = useState<string>()
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (statusId) {
      const interval = setInterval(async () => {
        await updateUploadStatus()
      }, JSON_STATUS_POLL_INTERVAL)
      return () => clearInterval(interval)
    }
  }, [statusId])

  const queryImportSummary = async () => {
    setIsLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)

      const { data } = await props.axios.post('/mod/qna/import/summary', form, axiosConfig)

      if (!data.fileQnaCount && !data.fileCmsCount) {
        setUploadStatus(`We were not able to extract any data from your file. Please validate the format`)
        setHasError(true)
      }

      setSummary(data)
    } catch (err) {
      toastFailure(err)
    } finally {
      setIsLoading(false)
    }
  }

  const submitChanges = async () => {
    setIsLoading(true)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('action', importAction)

      const { data } = await props.axios.post(`/mod/qna/import`, form, axiosConfig)
      setStatusId(data)
    } catch (err) {
      clearStatus()
      setHasError(true)
      toastFailure(err)
    }
  }

  const updateUploadStatus = async () => {
    const { data: status } = await props.axios.get(`/mod/qna/json-upload-status/${statusId}`)
    setUploadStatus(status)

    if (status === 'Completed') {
      clearStatus()
      closeDialog()
      toastSuccess('Upload successful')
      props.onImportCompleted()
    } else if (status.startsWith('Error')) {
      clearStatus()
      setHasError(true)
    }
  }

  const readFile = (files: FileList | null) => {
    if (files) {
      setFile(files[0])
      setFilePath(files[0].name)
    }
  }

  const clearStatus = () => {
    setStatusId(undefined)
    setIsLoading(false)
  }

  const closeDialog = () => {
    clearState()
    setDialogOpen(false)
  }

  const clearState = () => {
    setFilePath(undefined)
    setFile(undefined)
    setUploadStatus(undefined)
    setStatusId(undefined)
    setSummary(undefined)
    setHasError(false)
  }

  const renderUpload = () => {
    return (
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          readFile(e.dataTransfer.files)
        }}
      >
        <div className={Classes.DIALOG_BODY}>
          <FormGroup
            label={<span>Select your JSON file</span>}
            labelFor="input-archive"
            helperText={
              <span>
                Select a JSON file exported from the module QNA. You will see a summary of modifications when clicking
                on Next
              </span>
            }
          >
            <FileInput
              text={filePath || 'Choose file...'}
              onChange={e => readFile((e.target as HTMLInputElement).files)}
              fill={true}
            />
          </FormGroup>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              id="btn-next"
              text={isLoading ? 'Please wait...' : 'Next'}
              disabled={!filePath || !file || isLoading}
              onClick={queryImportSummary}
              intent={Intent.PRIMARY}
            />
          </div>
        </div>
      </div>
    )
  }

  const renderSummary = () => {
    const { qnaCount, cmsCount, fileQnaCount, fileCmsCount } = summary

    return (
      <Fragment>
        <div className={Classes.DIALOG_BODY}>
          {uploadStatus && (
            <Callout title={hasError ? 'Error' : 'Upload status'} intent={hasError ? Intent.DANGER : Intent.PRIMARY}>
              {uploadStatus}
            </Callout>
          )}

          {!uploadStatus && (
            <div>
              <p>
                Your file contains <strong>{fileQnaCount}</strong> questions and <strong>{fileCmsCount}</strong> content
                elements.
                <br />
                <br />
                The bot contains <strong>{qnaCount}</strong> questions and <strong>{cmsCount}</strong> content elements.
              </p>

              <p style={{ marginTop: 30 }}>
                <RadioGroup
                  label=" What would you like to do? "
                  onChange={e => setImportAction(e.target['value'])}
                  selectedValue={importAction}
                >
                  <Radio
                    label="Insert the new questions from my file and create/update associated content elements"
                    value="insert"
                  />
                  <Radio
                    label="Clear existing questions, then insert my new questions and create/update content elements"
                    value="clear_insert"
                  />
                </RadioGroup>
              </p>
            </div>
          )}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button id="btn-back" text={'Back'} disabled={isLoading} onClick={clearState} />
            <Button
              id="btn-submit"
              text={isLoading ? 'Please wait...' : 'Submit'}
              disabled={isLoading || hasError}
              onClick={submitChanges}
              intent={Intent.PRIMARY}
            />
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Button icon="download" id="btn-importJson" text="Import JSON" onClick={() => setDialogOpen(true)} />

      <Dialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        transitionDuration={0}
        title={!summary ? 'Upload File' : 'Summary'}
        icon="import"
      >
        {!summary ? renderUpload() : renderSummary()}
      </Dialog>
    </Fragment>
  )
}
