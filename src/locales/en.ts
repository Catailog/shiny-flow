export const en = {
  // AppHeader
  header: {
    logout: 'Sign out',
    login: 'Sign in with GitHub',
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
    untitled: 'Untitled',
    renameTitle: 'Rename',
  },

  // Home page
  home: {
    idle: 'Enter a project path and click Analyze.',
    analyzing: 'Analyzing...',
    analyzeDisabled: 'Analysis in progress.',
    confirmError: 'Confirm',
    slowWarning: 'Processing is taking too long. Keep waiting?',
    keepWaiting: 'Keep waiting',
    cancel: 'Cancel',
    importConfigPrompt: 'Restore analysis settings?',
    importConfigDesc: 'Restore project path, server URL, and auth settings along with the flow.',
    skip: 'Skip',
    load: 'Load',
    invalidJson: 'Not a valid shiny-flow JSON file.',
    jsonParseFailed: 'JSON parse failed',
    analyzeFailed: 'Analysis failed',
    unknownError: 'Unknown error',
    analyzingFiles: (done: number, total: number) => `Analyzing files (${done} / ${total})`,
    analysisDone: 'Analysis complete, preparing screenshot capture...',
    capturingScreenshots: (done: number, total: number) =>
      `Capturing screenshots (${done} / ${total})`,
    convertAuthorPrompt: 'Convert comment authors?',
    convertAuthorDesc:
      'Select UUIDs to convert. Converted comments will be assigned to your account name and cannot be edited afterwards.',
    convertAuthorConfirm: 'Convert',
    convertAuthorNone: '(no name)',
    convertAuthorComments: (n: number) => `${n} comment${n === 1 ? '' : 's'}`,
  },

  // Cloud toolbar
  cloud: {
    save: 'Save',
    myFlows: 'My Flows',
    share: 'Share',
    copied: 'Copied',
    noGraph: 'No analyzed graph.',
    loginRequired: 'Login required.',
    saveFirst: 'Save before sharing.',
    serverSaving: 'Saving link to server...',
    copyLink: 'Copy link',
    cancel: 'Cancel',
    noFlows: 'No saved flows.',
    confirmDelete: 'Delete?',
    delete: 'Delete',
    copyShareLink: 'Copy share link',
    rename: 'Rename',
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
    eg: 'e.g.',
    pathRequired: 'Enter the project path.',
    serverUrlRequired: 'Enter the server URL.',
    cookiesRequired: 'Enter the cookie JSON.',
    scriptRequired: 'Enter the script path.',
    scriptExtension: 'Enter a .js file path.',
  },

  // Context menu
  menu: {
    addComment: 'Add comment',
    createNode: 'Create node',
    edit: 'Edit',
    editComment: 'Edit comment',
    deleteComment: 'Delete comment',
    delete: 'Delete',
    expand: 'Expand',
    collapse: 'Collapse node',
    addMemo: 'Add memo',
    editMemo: 'Edit memo',
    deleteMemo: 'Delete memo',
    colorTag: 'Status tag',
    viewLarge: 'View full size',
    editGroup: 'Edit group',
    ungroup: 'Ungroup',
    editEdgeComment: 'Edit label',
    deleteEdgeComment: 'Delete label',
    deleteEdge: 'Delete edge',
    createGroup: 'Create group',
    edgeLineStyle: 'Line style',
    deleteNode: 'Delete node',
    deleteGroup: 'Delete group',
    deleteSelected: 'Delete selected',
    editNodeLabel: 'Edit label',
    editNodeRoute: 'Edit route',
    toggleNodeLabels: 'Toggle node labels',
    undo: 'Undo (Ctrl+Z)',
    redo: 'Redo (Ctrl+Y)',
  },

  edgeLineStyles: {
    solid: 'Solid',
    dashed: 'Dashed',
  },

  // Dialogs
  dialog: {
    screenshot: (label: string) => `${label} screenshot`,
    comment: {
      title: 'Comment',
      placeholder: 'Enter a comment...',
      edited: '(edited)',
      authorLabel: 'Author',
      authorUnset: '(not set)',
      authorChange: 'Change',
      authorConfirm: 'Confirm',
      authorUsername: 'Username',
      authorDevice: 'Device name',
      authorCustomPlaceholder: 'Enter a name...',
    },
    edgeComment: {
      title: 'Edge label',
      placeholder: 'Label...',
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
    labelEdit: {
      title: 'Edit node label',
      placeholder: 'Node name',
    },
    routeEdit: {
      title: 'Edit route',
      placeholder: '/path/to/page',
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
    viewRedirectedScreen: 'View redirected screen',
    enterValue: 'Enter value',
    recapture: 'Recapture',
    hiddenNodes: (n: number) => `${n} node${n === 1 ? '' : 's'} hidden`,
    collapsed: 'Collapsed',
  },

  // Share viewer
  shareViewer: {
    readOnly: 'Read-only',
  },

  // Flow viewer
  flowViewer: {
    groupButtonDisabled: 'Select 2+ nodes to group',
    groupButton: (n: number) => `Group ${n} nodes`,
  },

  // Flow edge
  flowEdge: {
    dragConnectionPoint: 'Drag: move connection / Double-click: restore',
    dragCurve: 'Drag: adjust curve / Double-click: restore straight',
  },

  // Node colors
  nodeColors: {
    status: {
      default: 'Default',
      green: 'Done',
      blue: 'In progress',
      yellow: 'Needs review',
      red: 'Important',
    },
    group: {
      gray: 'Gray',
      green: 'Green',
      blue: 'Blue',
      yellow: 'Yellow',
      red: 'Red',
      purple: 'Purple',
    },
  },

  // Date locale string
  dateLocale: 'en-US',

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
