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
  Link as LinkIcon,
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

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-surface">
      <div className="flex items-center gap-0.5 border-b border-neutral-100 bg-neutral-50 px-2 py-1.5">
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
        <div className="mx-1 h-4 w-px bg-neutral-200" />
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={toggleLink}
          icon={<LinkIcon className="size-3.5" />}
          label="Link"
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
          : 'text-neutral-500 hover:bg-surface hover:text-neutral-900',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      )}
    >
      {icon}
    </button>
  );
}
