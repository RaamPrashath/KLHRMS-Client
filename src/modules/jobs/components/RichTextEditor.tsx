'use client';

import { useEffect, type ReactNode } from 'react';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  minHeight = 120,
}: Readonly<RichTextEditorProps>) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: cn(
          'max-w-none px-3 py-2 font-sans text-sm leading-6 text-neutral-900',
          'focus:outline-none [&_a]:text-primary [&_a]:underline',
          '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-900',
          '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-neutral-900',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5',
          '[&_.is-editor-empty:first-child::before]:float-left',
          '[&_.is-editor-empty:first-child::before]:text-neutral-400',
          '[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.is-editor-empty:first-child::before]:h-0',
        ),
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === (content || '<p></p>')) return;
    editor.commands.setContent(content || '', { emitUpdate: false });
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="group/editor overflow-hidden rounded-lg border border-neutral-200 bg-surface transition-colors focus-within:border-primary/40">
      <div className="flex items-center gap-0.5 border-b border-neutral-100 bg-surface-subtle/60 px-2 py-1 opacity-60 transition-opacity duration-150 group-hover/editor:opacity-100 group-focus-within/editor:opacity-100">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold className="size-3.5" />}
          label="Bold"
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic className="size-3.5" />}
          label="Italic"
        />
        <div className="mx-1 h-4 w-px bg-neutral-200" />
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          icon={<Heading2 className="size-3.5" />}
          label="Heading 2"
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          icon={<Heading3 className="size-3.5" />}
          label="Heading 3"
        />
        <div className="mx-1 h-4 w-px bg-neutral-200" />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          icon={<List className="size-3.5" />}
          label="Bullet list"
        />
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          icon={<ListOrdered className="size-3.5" />}
          label="Ordered list"
        />
        <div className="flex-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={<Undo2 className="size-3.5" />}
          label="Undo"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={<Redo2 className="size-3.5" />}
          label="Redo"
        />
      </div>
      <EditorContent editor={editor} style={{ minHeight }} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  icon,
  label,
  disabled,
}: Readonly<{
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'flex size-8 items-center justify-center rounded-md transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        active
          ? 'bg-primary-ghost text-primary'
          : 'text-neutral-400 hover:bg-surface hover:text-neutral-900',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      )}
    >
      {icon}
    </button>
  );
}
