'use client';

import { useEffect, useReducer } from 'react';

import { Extension } from '@tiptap/core';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, UnderlineIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { FONT_SIZES, TEXT_COLOR_VALUES } from '../constants/memoEditor';

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
  const button = (
    <Button type="button" variant={active ? 'secondary' : 'ghost'} size="icon-sm" onClick={onClick}>
      {children}
    </Button>
  );

  if (!title) return button;

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

export function MemoEditor({ value, onChange }: Props) {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const t = useT();

  const TEXT_COLORS = TEXT_COLOR_VALUES.map(({ key, value: color }) => ({
    label: t.memoEditor[key],
    value: color,
  }));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Color,
      Placeholder.configure({ placeholder: t.memoEditor.placeholder }),
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

  const currentFontSize =
    (editor.getAttributes('textStyle').fontSize as string | undefined) ?? FONT_SIZES[1].size;

  // The browser normalizes hex colors to rgb(r, g, b) when parsing HTML, so compare both formats
  const hexToRgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };
  const storedColor = editor.getAttributes('textStyle').color as string | undefined;

  return (
    <div className="overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 px-2 py-1.5">
        {/* Format */}
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title={t.memoEditor.bold}
        >
          <BoldIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title={t.memoEditor.italic}
        >
          <ItalicIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title={t.memoEditor.underline}
        >
          <UnderlineIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Lists */}
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title={t.memoEditor.bulletList}
        >
          <ListIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title={t.memoEditor.orderedList}
        >
          <ListOrderedIcon size={14} style={{ fill: 'none' }} />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Font size */}
        {FONT_SIZES.map(({ label, size }) => (
          <Tooltip key={label}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={currentFontSize === size ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() =>
                    currentFontSize === size
                      ? editor.chain().focus().unsetFontSize().run()
                      : editor.chain().focus().setFontSize(size).run()
                  }
                  className="w-7 text-xs"
                >
                  {label}
                </Button>
              }
            />
            <TooltipContent>{t.memoEditor.fontSize(label)}</TooltipContent>
          </Tooltip>
        ))}

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Text color */}
        <div className="flex items-center gap-1">
          {TEXT_COLORS.map(({ label, value: color }) => {
            const isActive =
              color === 'inherit'
                ? !storedColor
                : storedColor === color || storedColor === hexToRgb(color);
            return (
              <Tooltip key={label}>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        color === 'inherit'
                          ? editor.chain().focus().setMark('textStyle', { color: null }).run()
                          : editor.chain().focus().setColor(color).run()
                      }
                      className={cn(
                        'size-4 min-h-0 min-w-0 rounded-full border p-0 transition-transform hover:scale-110 hover:bg-transparent',
                        isActive
                          ? 'scale-110 ring-2 ring-foreground ring-offset-1 ring-offset-background'
                          : 'border-transparent',
                        color === 'inherit' && 'border-border',
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
                  }
                />
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Editor body */}
      <div className="bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
