'use client';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { GROUP_COLORS, GROUP_COLOR_STYLES } from '../../lib/nodeColors';

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function GroupColorPicker({ value, onChange }: Props) {
  const t = useT();

  return (
    <div className="flex gap-2">
      {GROUP_COLORS.map(({ value: colorValue }) => {
        const colorKey = colorValue as keyof typeof t.nodeColors.group;
        const colorLabel = t.nodeColors.group[colorKey] ?? colorValue;
        const s = GROUP_COLOR_STYLES[colorValue];
        return (
          <Button
            key={colorValue}
            variant="ghost"
            size="icon"
            title={colorLabel}
            onClick={() => onChange(colorValue)}
            className={cn(
              'h-6 w-6 rounded-full border-2 p-0 transition-transform',
              s.button,
              value === colorValue ? 'scale-125 border-white' : 'border-transparent',
            )}
          />
        );
      })}
    </div>
  );
}
