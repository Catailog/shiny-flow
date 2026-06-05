import type { Translations } from './en';

export const ko: Translations = {
  // AppHeader
  header: {
    logout: '로그아웃',
    login: 'GitHub 로그인',
    switchToDark: '다크 모드로 전환',
    switchToLight: '라이트 모드로 전환',
  },

  // Home page
  home: {
    idle: '프로젝트 경로를 입력하고 분석 버튼을 눌러보세요.',
    analyzing: '분석 중...',
    analyzeDisabled: '분석 중입니다.',
    confirmError: '확인',
    slowWarning: '서버 응답이 늦고 있습니다. 계속 기다리시겠습니까?',
    keepWaiting: '계속 기다리기',
    cancel: '취소',
    importConfigPrompt: '분석 설정도 불러올까요?',
    importConfigDesc: '프로젝트 경로, 서버 URL, 인증 정보 등 분석 설정을 함께 복원합니다.',
    skip: '건너뛰기',
    load: '불러오기',
    invalidJson: '유효한 shiny-flow JSON 파일이 아닙니다.',
    jsonParseFailed: 'JSON 파싱 실패',
    analyzeFailed: '분석 실패',
    unknownError: '알 수 없는 오류',
  },

  // Cloud toolbar
  cloud: {
    save: '저장',
    myFlows: '내 플로우',
    share: '공유',
    copied: '복사됨',
    noGraph: '분석된 그래프가 없습니다.',
    loginRequired: '로그인이 필요합니다.',
    saveFirst: '먼저 저장해야 공유할 수 있습니다.',
    serverSaving: '공유 링크를 서버에 저장하는 중입니다.',
    copyLink: '링크 복사',
    saveFlow: '플로우 저장',
    flowName: '플로우 이름',
    cancel: '취소',
    noFlows: '저장된 플로우가 없습니다.',
    confirmDelete: '삭제할까요?',
    delete: '삭제',
    copyShareLink: '공유 링크 복사',
  },

  // Project input
  input: {
    projectPath: '프로젝트 경로',
    projectPathPlaceholder: 'Next.js 프로젝트 절대 경로',
    importJson: 'JSON 불러오기',
    exportJson: 'JSON 내보내기',
    exportDisabled: '분석된 그래프가 없어 JSON 내보내기가 불가능합니다.',
    screenshot: '스크린샷 캡처',
    serverUrl: '서버 URL',
    serverUrlPlaceholder: '대상 서버 URL',
    auth: '인증:',
    authNone: '없음',
    authCookies: '쿠키 주입',
    authScript: '스크립트',
    scriptPath: '스크립트 경로 (프로젝트 루트 기준 상대 경로)',
    scriptPathHint: '파일이 없으면 npx shiny-flow init 으로 생성하세요.',
    cookiesJson: '쿠키 JSON (DevTools › Application › Cookies에서 복사)',
    analyze: '분석',
    analyzing: '분석 중...',
    eg: '예',
    pathRequired: '프로젝트 경로를 입력해주세요.',
    serverUrlRequired: '서버 URL을 입력해주세요.',
    cookiesRequired: '쿠키 JSON을 입력해주세요.',
    scriptRequired: '스크립트 경로를 입력해주세요.',
    scriptExtension: '.js 파일 경로를 입력해주세요.',
  },

  // Context menu
  menu: {
    addComment: '댓글 생성',
    createNode: '노드 생성',
    edit: '수정',
    delete: '삭제',
    expand: '펼치기',
    collapse: '접기',
    addMemo: '메모 추가',
    editMemo: '메모 수정',
    deleteMemo: '메모 삭제',
    colorTag: '색상 태그',
    viewLarge: '크게 보기',
    editGroup: '그룹 수정',
    ungroup: '그룹 해제',
    editEdgeComment: '코멘트 편집',
    deleteEdgeComment: '코멘트 삭제',
    deleteEdge: '엣지 삭제',
    createGroup: '그룹 생성',
  },

  // Dialogs
  dialog: {
    screenshot: (label: string) => `${label} 스크린샷`,
    comment: {
      title: '댓글',
      placeholder: '댓글을 입력하세요...',
      edited: '(수정됨)',
    },
    edgeComment: {
      title: '엣지 코멘트',
      placeholder: '코멘트...',
    },
    groupCreate: {
      title: '그룹 만들기',
      namePlaceholder: '그룹 이름',
      defaultName: '그룹',
      confirm: '만들기',
    },
    groupEdit: {
      title: '그룹 수정',
    },
    groupUngroup: {
      title: '그룹 해제',
      description: '해제된 그룹의 자식 노드들을 어떻게 처리할까요?',
      keepInParent: '부모 그룹에 남기기',
      moveOut: '그룹 바깥으로 이동',
    },
    memo: {
      title: '메모',
    },
    nodeCreate: {
      title: '노드 생성',
      namePlaceholder: '페이지 이름',
      defaultName: '새 페이지',
      confirm: '만들기',
    },
    save: '저장',
    cancel: '취소',
  },

  // Flow comment node
  commentNode: {
    secondsAgo: (n: number) => `${n}초 전`,
    minutesAgo: (n: number) => `${n}분 전`,
    hoursAgo: (n: number) => `${n}시간 전`,
    daysAgo: (n: number) => `${n}일 전`,
    monthsAgo: (n: number) => `${n}개월 전`,
    yearsAgo: (n: number) => `${n}년 전`,
    edited: '(수정됨)',
    clickToAdd: '클릭하여 댓글 추가',
  },

  // Flow node
  flowNode: {
    viewBeforeRedirect: '리다이렉트 되기 전 화면 보기',
    enterValue: '값 입력',
    recapture: '재캡처',
    hiddenNodes: (n: number) => `${n}개 노드 숨김`,
    collapsed: '접힘',
  },

  // Share viewer
  shareViewer: {
    readOnly: '읽기 전용',
  },

  // Flow viewer
  flowViewer: {
    groupButtonDisabled: '2개 이상 노드를 선택하세요',
    groupButton: (n: number) => `${n}개 노드 그룹화`,
  },

  // Flow edge
  flowEdge: {
    dragConnectionPoint: '드래그: 연결점 이동 / 더블클릭: 자동 위치 복원',
    dragCurve: '드래그: 곡선 조정 / 더블클릭: 직선으로 복원',
  },

  // Node colors
  nodeColors: {
    status: {
      default: '기본',
      green: '완료',
      blue: '작업 중',
      yellow: '검토 필요',
      red: '중요',
    },
    group: {
      gray: '회색',
      green: '초록',
      blue: '파랑',
      yellow: '노랑',
      red: '빨강',
      purple: '보라',
    },
  },

  // Date locale string
  dateLocale: 'ko-KR',

  // Memo editor
  memoEditor: {
    placeholder: '메모를 입력하세요...',
    bold: '굵게',
    italic: '기울임',
    underline: '밑줄',
    bulletList: '글머리 기호 목록',
    orderedList: '번호 매기기 목록',
    fontSize: (label: string) => `글씨 크기 ${label}`,
    colorDefault: '기본',
    colorRed: '빨강',
    colorOrange: '주황',
    colorYellow: '노랑',
    colorGreen: '초록',
    colorBlue: '파랑',
    colorPurple: '보라',
    colorGray: '회색',
  },
};
