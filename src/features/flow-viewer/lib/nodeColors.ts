export const STATUS_COLORS = [
  { label: '기본', value: undefined },
  { label: '완료', value: 'green' },
  { label: '작업 중', value: 'blue' },
  { label: '검토 필요', value: 'yellow' },
  { label: '중요', value: 'red' },
] as const;

export const NODE_COLOR_STYLES: Record<string, { border: string; bg: string; dot: string }> = {
  green: { border: 'border-green-400', bg: 'bg-green-50', dot: 'bg-green-400' },
  blue: { border: 'border-blue-400', bg: 'bg-blue-50', dot: 'bg-blue-400' },
  yellow: { border: 'border-yellow-400', bg: 'bg-yellow-50', dot: 'bg-yellow-400' },
  red: { border: 'border-red-400', bg: 'bg-red-50', dot: 'bg-red-400' },
};

export const GROUP_COLORS = [
  { label: '회색', value: 'gray' },
  { label: '초록', value: 'green' },
  { label: '파랑', value: 'blue' },
  { label: '노랑', value: 'yellow' },
  { label: '빨강', value: 'red' },
  { label: '보라', value: 'purple' },
] as const;

export const GROUP_COLOR_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  gray: { border: 'border-gray-300', bg: 'bg-gray-100/70', text: 'text-gray-500' },
  green: { border: 'border-green-300', bg: 'bg-green-50/70', text: 'text-green-600' },
  blue: { border: 'border-blue-300', bg: 'bg-blue-50/70', text: 'text-blue-600' },
  yellow: { border: 'border-yellow-300', bg: 'bg-yellow-50/70', text: 'text-yellow-600' },
  red: { border: 'border-red-300', bg: 'bg-red-50/70', text: 'text-red-600' },
  purple: { border: 'border-purple-300', bg: 'bg-purple-50/70', text: 'text-purple-600' },
};

export function getNodeColorStyle(color?: string) {
  return color ? (NODE_COLOR_STYLES[color] ?? null) : null;
}

export function getGroupColorStyle(color: string) {
  return GROUP_COLOR_STYLES[color] ?? GROUP_COLOR_STYLES.gray;
}
