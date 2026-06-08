export const STATUS_COLORS = [
  { label: '기본', value: undefined },
  { label: '완료', value: 'green' },
  { label: '작업 중', value: 'blue' },
  { label: '검토 필요', value: 'yellow' },
  { label: '중요', value: 'red' },
] as const;

export const NODE_COLOR_STYLES: Record<string, { border: string; bg: string; dot: string }> = {
  green: {
    border: 'border-green-400',
    bg: 'bg-green-50 dark:bg-green-950/40',
    dot: 'bg-green-400',
  },
  blue: { border: 'border-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', dot: 'bg-blue-400' },
  yellow: {
    border: 'border-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    dot: 'bg-yellow-400',
  },
  red: { border: 'border-red-400', bg: 'bg-red-50 dark:bg-red-950/40', dot: 'bg-red-400' },
};

export const GROUP_COLORS = [
  { label: '회색', value: 'gray' },
  { label: '초록', value: 'green' },
  { label: '파랑', value: 'blue' },
  { label: '노랑', value: 'yellow' },
  { label: '빨강', value: 'red' },
  { label: '보라', value: 'purple' },
] as const;

export const GROUP_COLOR_STYLES: Record<
  string,
  { border: string; bg: string; text: string; button: string }
> = {
  gray: {
    border: 'border-gray-400',
    bg: 'bg-gray-200/70 dark:bg-gray-800/40',
    text: 'text-gray-600 dark:text-gray-300',
    button: 'bg-gray-400',
  },
  green: {
    border: 'border-green-500',
    bg: 'bg-green-100/70 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    button: 'bg-green-500',
  },
  blue: {
    border: 'border-blue-500',
    bg: 'bg-blue-100/70 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    button: 'bg-blue-500',
  },
  yellow: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-100/70 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    button: 'bg-yellow-400',
  },
  red: {
    border: 'border-red-500',
    bg: 'bg-red-100/70 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    button: 'bg-red-500',
  },
  purple: {
    border: 'border-purple-500',
    bg: 'bg-purple-100/70 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    button: 'bg-purple-500',
  },
};

export function getNodeColorStyle(color?: string) {
  return color ? (NODE_COLOR_STYLES[color] ?? null) : null;
}

export function getGroupColorStyle(color: string) {
  return GROUP_COLOR_STYLES[color] ?? GROUP_COLOR_STYLES.gray;
}
