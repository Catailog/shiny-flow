'use client';

import { useEffect, useReducer } from 'react';

import { Extension } from '@tiptap/core';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, UnderlineIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions: () => ({ types: ['textStyle'] }),
  addGlobalAttributes() {
    return [
      {
        types: this.options.types as string[],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).run(),
    };
  },
});

const FONT_SIZES = [
  { label: 'S', size: '12px' },
  { label: 'M', size: '14px' },
  { label: 'L', size: '18px' },
  { label: 'XL', size: '24px' },
] as const;

const TEXT_COLORS = [
  { label: '기본', value: 'inherit' },
  { label: '빨강', value: '#ef4444' },
  { label: '주황', value: '#f97316' },
  { label: '노랑', value: '#eab308' },
  { label: '초록', value: '#22c55e' },
  { label: '파랑', value: '#3b82f6' },
  { label: '보라', value: '#a855f7' },
  { label: '회색', value: '#6b7280' },
] as const;

type Props = {
  value: string;
  onChange: (html: string) => void;
};

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

export function MemoEditor({ value, onChange }: Props) {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      Color,
      Placeholder.configure({ placeholder: '메모를 입력하세요...' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'min-h-[140px] px-4 py-3 text-sm focus:outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li>p]:my-0',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', forceUpdate);
    return () => {
      editor.off('transaction', forceUpdate);
    };
  }, [editor, forceUpdate]);

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) return null;

  const currentFontSize = editor.getAttributes('textStyle').fontSize as string | undefined;

  // 브라우저 DOM이 HTML 파싱 시 hex → rgb(r, g, b) 로 정규화하므로 두 형식 모두 비교
  const hexToRgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };
  const storedColor = editor.getAttributes('textStyle').color as string | undefined;

  return (
    <div className="overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 px-2 py-1.5">
        {/* 서식 */}
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="굵게"
        >
          <BoldIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="기울임"
        >
          <ItalicIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="밑줄"
        >
          <UnderlineIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* 목록 */}
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="글머리 기호 목록"
        >
          <ListIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="번호 매기기 목록"
        >
          <ListOrderedIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* 폰트 크기 */}
        {FONT_SIZES.map(({ label, size }) => (
          <Button
            key={label}
            type="button"
            variant={currentFontSize === size ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={() =>
              currentFontSize === size
                ? editor.chain().focus().unsetFontSize().run()
                : editor.chain().focus().setFontSize(size).run()
            }
            className="w-7 text-xs"
            title={`글씨 크기 ${label}`}
          >
            {label}
          </Button>
        ))}

        <div className="mx-1 h-4 w-px bg-border" />

        {/* 텍스트 색상 */}
        <div className="flex items-center gap-1">
          {TEXT_COLORS.map(({ label, value: color }) => {
            const isActive =
              color === 'inherit'
                ? !storedColor
                : storedColor === color || storedColor === hexToRgb(color);
            return (
              <button
                key={label}
                type="button"
                title={label}
                onClick={() =>
                  color === 'inherit'
                    ? editor.chain().focus().setMark('textStyle', { color: null }).run()
                    : editor.chain().focus().setColor(color).run()
                }
                className={cn(
                  'size-4 rounded-full border transition-transform hover:scale-110',
                  isActive
                    ? 'scale-110 ring-2 ring-foreground ring-offset-1 ring-offset-background'
                    : 'border-transparent',
                  color === 'inherit' && 'border-gray-300',
                )}
                style={
                  color === 'inherit'
                    ? {
                        background:
                          'linear-gradient(to bottom right, #fff 40%, #ef4444 40%, #ef4444 60%, #fff 60%)',
                      }
                    : { backgroundColor: color }
                }
              />
            );
          })}
        </div>
      </div>

      {/* 에디터 본문 */}
      <div className="bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
