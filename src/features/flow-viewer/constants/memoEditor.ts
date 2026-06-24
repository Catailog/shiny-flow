export const FONT_SIZES = [
  { label: 'S', size: '12px' },
  { label: 'M', size: '14px' },
  { label: 'L', size: '18px' },
  { label: 'XL', size: '24px' },
] as const;

export type MemoColorKey =
  | 'colorDefault'
  | 'colorRed'
  | 'colorOrange'
  | 'colorYellow'
  | 'colorGreen'
  | 'colorBlue'
  | 'colorPurple'
  | 'colorGray';

export const TEXT_COLOR_VALUES: { key: MemoColorKey; value: string }[] = [
  { key: 'colorDefault', value: 'inherit' },
  { key: 'colorRed', value: '#ef4444' },
  { key: 'colorOrange', value: '#f97316' },
  { key: 'colorYellow', value: '#eab308' },
  { key: 'colorGreen', value: '#22c55e' },
  { key: 'colorBlue', value: '#3b82f6' },
  { key: 'colorPurple', value: '#a855f7' },
  { key: 'colorGray', value: '#6b7280' },
];
