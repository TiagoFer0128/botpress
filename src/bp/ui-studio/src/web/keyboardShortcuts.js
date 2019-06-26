const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
const controlKey = isMac ? 'command' : 'ctrl'

export const keyMap = {
  // Navigation to screens
  // PROPOSAL STAGE
  // 'go-flow-editor': 'g f',
  // 'go-nlu': 'g n',
  // 'go-content': 'g c',
  // 'go-emulator': 'g e',
  // 'go-module-qna': 'g m q',
  add: `${controlKey}+a`,
  save: `${controlKey}+s`,
  undo: `${controlKey}+z`,
  redo: `${controlKey}+shift+z`,
  'emulator-focus': `e`,
  'docs-toggle': `${controlKey}+h`,
  'lang-switcher': `${controlKey}+l`,
  'toggle-sidepanel': `${controlKey}+b`,
  'create-new': `${controlKey}+alt+n`,
  cancel: 'esc',
  'go-flow': `g f`,
  'go-content': `g c`,
  'go-module-code': `g m c`,
  'go-module-qna': `g m q`,
  'go-module-testing': `g m t`,
  'go-module-analytics': 'g m a',
  'go-module-nlu-intent': `g i`,
  'go-module-nlu-entities': `g e`
}

export const isInputFocused = () => {
  if (!document.activeElement) {
    return false
  }

  const tag = document.activeElement.tagName
  const isEditable = document.activeElement.isContentEditable || document.activeElement.contenteditable === 'true'
  const inputTypes = ['textarea', 'input']
  return (tag && inputTypes.includes(tag.toLowerCase())) || isEditable
}
