const appendOutgoingMsg = async () => {
  if (event.type === 'text') {
    await bp.database('msg_history').insert({
      created_on: event.createdOn,
      thread_id: event.threadId,
      msg_content: JSON.stringify(event)
    })
  }
}

return appendOutgoingMsg()
