export const en = {
  // AppHeader
  header: {
    logout: 'Sign out',
    login: 'Sign in with GitHub',
  },

  // Home page
  home: {
    idle: 'Enter a project path and click Analyze.',
    analyzing: 'Analyzing...',
    analyzeDisabled: 'Analysis in progress.',
    confirmError: 'Confirm',
    slowWarning: 'Server is taking too long. Keep waiting?',
    keepWaiting: 'Keep waiting',
    cancel: 'Cancel',
    importConfigPrompt: 'Restore analysis settings?',
    importConfigDesc: 'Restore project path, server URL, and auth settings along with the flow.',
    skip: 'Skip',
    load: 'Load',
    invalidJson: 'Not a valid shiny-flow JSON file.',
    jsonParseFailed: 'JSON parse failed',
  },

  // Cloud toolbar
  cloud: {
    save: 'Save',
    myFlows: 'My Flows',
    share: 'Share',
    generating: 'Generating...',
    copied: 'Copied',
    noGraph: 'No analyzed graph.',
    loginRequired: 'Login required.',
    saveFirst: 'Save before sharing.',
    serverSaving: 'Saving link to server...',
    copyLink: 'Copy link',
    saveFlow: 'Save Flow',
    flowName: 'Flow name',
    cancel: 'Cancel',
    noFlows: 'No saved flows.',
    confirmDelete: 'Delete?',
    delete: 'Delete',
    copyShareLink: 'Copy share link',
  },

  // Project input
  input: {
    projectPath: 'Project path',
    projectPathPlaceholder: 'Absolute path to Next.js project',
    importJson: 'Import JSON',
    exportJson: 'Export JSON',
    exportDisabled: 'No analyzed graph to export JSON.',
    screenshot: 'Capture screenshots',
    serverUrl: 'Server URL',
    serverUrlPlaceholder: 'Target server URL',
    auth: 'Auth:',
    authNone: 'None',
    authCookies: 'Cookie injection',
    authScript: 'Script',
    scriptPath: 'Script path (relative to project root)',
    scriptPathHint: 'Run npx shiny-flow init to create the file.',
    cookiesJson: 'Cookie JSON (copy from DevTools › Application › Cookies)',
    analyze: 'Analyze',
    analyzing: 'Analyzing...',
  },

  // Context menu
  menu: {
    addComment: 'Add comment',
    createNode: 'Create node',
    edit: 'Edit',
    delete: 'Delete',
    expand: 'Expand',
    collapse: 'Collapse',
    addMemo: 'Add memo',
    editMemo: 'Edit memo',
    deleteMemo: 'Delete memo',
    colorTag: 'Color tag',
    viewLarge: 'View full size',
    editGroup: 'Edit group',
    ungroup: 'Ungroup',
    editEdgeComment: 'Edit comment',
    deleteEdgeComment: 'Delete comment',
    deleteEdge: 'Delete edge',
    createGroup: 'Create group',
  },

  // Dialogs
  dialog: {
    screenshot: (label: string) => `${label} screenshot`,
    comment: {
      title: 'Comment',
      placeholder: 'Enter a comment...',
      edited: '(edited)',
    },
    edgeComment: {
      title: 'Edge comment',
      placeholder: 'Comment...',
    },
    groupCreate: {
      title: 'Create group',
      namePlaceholder: 'Group name',
      defaultName: 'Group',
      confirm: 'Create',
    },
    groupEdit: {
      title: 'Edit group',
    },
    groupUngroup: {
      title: 'Ungroup',
      description: 'What should happen to the child nodes?',
      keepInParent: 'Keep in parent group',
      moveOut: 'Move out of group',
    },
    memo: {
      title: 'Memo',
    },
    nodeCreate: {
      title: 'Create node',
      namePlaceholder: 'Page name',
      defaultName: 'New page',
      confirm: 'Create',
    },
    save: 'Save',
    cancel: 'Cancel',
  },

  // Flow comment node
  commentNode: {
    secondsAgo: (n: number) => `${n}s ago`,
    minutesAgo: (n: number) => `${n}m ago`,
    hoursAgo: (n: number) => `${n}h ago`,
    daysAgo: (n: number) => `${n}d ago`,
    monthsAgo: (n: number) => `${n}mo ago`,
    yearsAgo: (n: number) => `${n}y ago`,
    edited: '(edited)',
    clickToAdd: 'Click to add a comment',
  },

  // Flow node
  flowNode: {
    viewBeforeRedirect: 'View before redirect',
    enterValue: 'Enter value',
    recapture: 'Recapture',
    hiddenNodes: (n: number) => `${n} node${n === 1 ? '' : 's'} hidden`,
    collapsed: 'Collapsed',
  },

  // Memo editor
  memoEditor: {
    placeholder: 'Write a memo...',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    bulletList: 'Bullet list',
    orderedList: 'Numbered list',
    fontSize: (label: string) => `Font size ${label}`,
    colorDefault: 'Default',
    colorRed: 'Red',
    colorOrange: 'Orange',
    colorYellow: 'Yellow',
    colorGreen: 'Green',
    colorBlue: 'Blue',
    colorPurple: 'Purple',
    colorGray: 'Gray',
  },
};

export type Translations = typeof en;
