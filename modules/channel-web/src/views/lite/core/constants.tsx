export default {
  /** These types are sent using the /message/ endpoint */
  MESSAGE_TYPES: ['text', 'quick_reply', 'form', 'login_prompt', 'visit', 'postback'],
  /** The duration of the hide / show chat */
  ANIM_DURATION: 300,
  MIN_TIME_BETWEEN_SOUNDS: 1000,
  HISTORY_STARTING_POINT: -1,
  HISTORY_MAX_MESSAGES: 10,
  /** The number of minutes before a new timestamp is displayed */
  TIME_BETWEEN_DATES: 10,
  DEFAULT_LAYOUT_WIDTH: 360,
  DEFAULT_CONTAINER_WIDTH: 360,
  /** The default configuration when starting the chat */
  DEFAULT_CONFIG: {
    userId: undefined,
    stylesheet: '/assets/modules/channel-web/default.css',
    extraStylesheet: '',
    botName: undefined,
    botConvoDescription: undefined,
    overrides: undefined,
    enableReset: true,
    enableTranscriptDownload: true,
    enableArrowNavigation: false,
    showConversationsButton: true,
    showUserName: false,
    showUserAvatar: false,
    disableAnimations: false,
    hideWidget: false,
    externalAuthToken: undefined,
    showPoweredBy: window.SHOW_POWERED_BY
  }
}
