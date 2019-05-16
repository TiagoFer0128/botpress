import { RootStore } from './store'

declare global {
  interface Window {
    __BP_VISITOR_ID: string
    botpressWebChat: any
    BOT_API_PATH: string
    API_PATH: string
    BOTPRESS_VERSION: string
    BOT_NAME: string
    BOT_ID: string
    BP_BASE_PATH: string
    SEND_USAGE_STATS: boolean
    botpress: {
      [moduleName: string]: any
    }
  }
}

export namespace Renderer {
  export interface Message {
    type?: string
    payload?: any
    store?: RootStore
    bp?: StudioConnector
    /** When true, the message isn't wrapped by its bubble */
    noBubble?: boolean
    keyboard?: any
    eventId?: string

    isLastGroup?: boolean
    isLastOfGroup?: boolean
    isBotMessage?: boolean
    isLastMessage?: boolean
    sentOn?: Date

    onSendData?: (data: any) => Promise<void>
    onFileUpload?: (label: string, payload: any, file: File) => Promise<void>
  }

  export type Button = {
    label: string
    payload: any
    preventDoubleClick: boolean
    onButtonClick: (title: any, payload: any) => void
  } & Pick<Message, 'onFileUpload'>

  export type Text = {
    text: string
    markdown: boolean
  } & Message

  export type QuickReply = {
    buttons: any
    quick_replies: any
  } & Message

  export type QuickReplyButton = {
    allowMultipleClick: boolean
    title: string
  } & Button

  export interface FileMessage {
    file: {
      url: string
      name: string
      storage: string
      text: string
    }
  }

  export interface FileInput {
    onFileChanged: (event: HTMLInputEvent) => void
    name: string
    className: string
    accept: string
    placeholder: string
    disabled?: boolean
  }

  export interface Carousel {
    elements: Card[]
    settings: any
  }

  export interface Card {
    picture: string
    title: string
    subtitle: string
    buttons: CardButton[]
  }

  export interface CardButton {
    url: string
    title: string
    type: string
    payload: any
    text: string
  }
}

export namespace View {
  export type MenuAnimations = 'fadeIn' | 'fadeOut' | undefined
}

/** These are the functions exposed by the studio to the modules */
export interface StudioConnector {
  /** Event emitter */
  events: any
  /** An axios instance */
  axios: any
  toast: any
  getModuleInjector: any
  loadModuleView: any
}

export type Config = {
  botId?: string
  externalAuthToken?: string
  userId?: string
  enableReset: boolean
  stylesheet: string
  extraStylesheet: string
  showConversationsButton: boolean
  showUserName: boolean
  showUserAvatar: boolean
  enableTranscriptDownload: boolean
  enableArrowNavigation: boolean
  botName?: string
  avatarUrl?: string
  /** Small description written under the bot's name */
  botConvoDescription?: string
  /** Replace or insert components at specific locations */
  overrides?: Overrides
  /** When true, the widget button is hidden */
  hideWidget: boolean
  recentConversationLifetime: string
  startNewConvoOnTimeout: boolean
  containerWidth?: string | number
  layoutWidth?: string | number
}

type OverridableComponents = 'below_conversation' | 'before_container' | 'composer'

interface Overrides {
  [componentToOverride: string]: {
    module: string
    component: string
  }
}

interface BotDetails {
  website?: string
  phoneNumber?: string
  termsConditions?: string
  privacyPolicy?: string
  emailAddress?: string
  avatarUrl?: string
}

export interface BotInfo {
  name: string
  description: string
  details: BotDetails
  showBotInfoPage: boolean
}

interface Conversation {
  id: number
  last_heard_on: Date | undefined
  logo_url: string | undefined
  created_on: Date
  description: string | undefined
  title: string
}

/** This is the interface representing the conversations in the list  */
export type ConversationSummary = {
  message_sent_on: Date
  message_author: string
  message_author_avatar: string
  message_text: string
  message_type: string
} & Conversation

/** Represents the current conversation with all messages */
export type CurrentConversation = {
  botId: string
  messages: Message[]
  userId: string
  user_last_seen_on: Date | undefined
  /** Event ?  */
  typingUntil: any
} & Conversation

export interface Message {
  id: string
  userId: string
  conversationId: number
  avatar_url: string | undefined
  full_name: string
  message_data: any | undefined
  message_raw: any | undefined
  message_text: string | undefined
  message_type: string | undefined
  payload: any
  sent_on: Date
  // The typing delay in ms
  timeInMs: number
}

export interface HTMLInputEvent extends Event {
  target: HTMLInputElement & EventTarget
}

interface ChatDimensions {
  /**
   * The container is the frame around the webchat.
   * Setting the container bigger than the layout makes it possible to add components
   */
  container: string | number
  /** The layout is the zone where the user speaks with the bot */
  layout: string | number
}

interface CustomButton {
  /** An ID representing your button, it is required if you need to remove it */
  id?: string
  /** When disabled, nobody can click on it */
  disabled?: boolean
  /** The icon displayed  */
  icon?: string
  /** The event triggered when the button is clicked */
  onClick: (btnId: string, headerComponent: JSX.Element, e: React.MouseEvent) => void
}
