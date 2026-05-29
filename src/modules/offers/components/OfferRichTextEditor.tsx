'use client';

import { useEffect, type ReactNode } from 'react';
import { Extension, Node, mergeAttributes, type JSONContent } from '@tiptap/core';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  Table,
  Undo2,
  WrapText,
} from 'lucide-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

export interface OfferVariableToken {
  group: string;
  label: string;
  token: string;
}

export interface OfferEditorValue {
  html: string;
  json: Record<string, unknown>;
}

interface OfferRichTextEditorProps {
  readonly contentHtml: string;
  readonly contentJson: Record<string, unknown>;
  readonly placeholder?: string;
  readonly minHeight?: number;
  readonly onChange: (value: OfferEditorValue) => void;
}

const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }, { tag: 'hr' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-page-break': 'true', class: 'offer-page-break' })];
  },
});

const SimpleTable = Node.create({
  name: 'table',
  group: 'block',
  content: 'tableRow+',
  parseHTML() {
    return [{ tag: 'table' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['table', mergeAttributes(HTMLAttributes, { class: 'offer-table' }), ['tbody', 0]];
  },
});

const SimpleTableRow = Node.create({
  name: 'tableRow',
  content: '(tableCell | tableHeader)*',
  parseHTML() {
    return [{ tag: 'tr' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['tr', mergeAttributes(HTMLAttributes), 0];
  },
});

const SimpleTableCell = Node.create({
  name: 'tableCell',
  content: 'block+',
  isolating: true,
  parseHTML() {
    return [{ tag: 'td' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['td', mergeAttributes(HTMLAttributes), 0];
  },
});

const SimpleTableHeader = Node.create({
  name: 'tableHeader',
  content: 'block+',
  isolating: true,
  parseHTML() {
    return [{ tag: 'th' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['th', mergeAttributes(HTMLAttributes), 0];
  },
});

const VariableShortcut = Extension.create({
  name: 'offerVariableShortcut',
  addKeyboardShortcuts() {
    return {
      // Ctrl+Space inserts the primary required candidate token at the current cursor.
      'Mod-Space': () => this.editor.chain().focus().insertContent('{{candidate.firstName}}').run(),
    };
  },
});

export const OFFER_VARIABLE_TOKENS: OfferVariableToken[] = [
  { group: 'Candidate', label: 'First name', token: '{{candidate.firstName}}' },
  { group: 'Candidate', label: 'Last name', token: '{{candidate.lastName}}' },
  { group: 'Offer', label: 'Generated date', token: '{{offer.generatedDate}}' },
  { group: 'Compensation', label: 'Salary min', token: '{{job.salaryMin}}' },
  { group: 'Compensation', label: 'Salary max', token: '{{job.salaryMax}}' },
  { group: 'Compensation', label: 'Currency', token: '{{job.currency}}' },
];

function groupedTokens(): Array<{ group: string; tokens: OfferVariableToken[] }> {
  const groups = new Map<string, OfferVariableToken[]>();
  for (const token of OFFER_VARIABLE_TOKENS) {
    groups.set(token.group, [...(groups.get(token.group) ?? []), token]);
  }
  return Array.from(groups.entries()).map(([group, tokens]) => ({ group, tokens }));
}

function normalizedContent(contentJson: Record<string, unknown>, contentHtml: string): JSONContent | string {
  return Object.keys(contentJson).length > 0 ? (contentJson as JSONContent) : contentHtml;
}

export function OfferRichTextEditor({
  contentHtml,
  contentJson,
  placeholder = 'Write this section...',
  minHeight = 260,
  onChange,
}: OfferRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      PageBreakNode,
      SimpleTable,
      SimpleTableRow,
      SimpleTableCell,
      SimpleTableHeader,
      VariableShortcut,
    ],
    content: normalizedContent(contentJson, contentHtml),
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      onChange({
        html: html === '<p></p>' ? '' : html,
        json: currentEditor.getJSON() as Record<string, unknown>,
      });
    },
    editorProps: {
      attributes: {
        class: cn(
          'max-w-none px-4 py-3 font-sans text-sm leading-6 text-neutral-900',
          'focus:outline-none [&_a]:text-primary [&_a]:underline',
          '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-900',
          '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-neutral-900',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5',
          '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-2',
          '[&_.offer-page-break]:my-5 [&_.offer-page-break]:h-px [&_.offer-page-break]:border-t [&_.offer-page-break]:border-dashed [&_.offer-page-break]:border-primary',
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
    const nextContent = normalizedContent(contentJson, contentHtml);
    const nextJsonString = typeof nextContent === 'string' ? '' : JSON.stringify(nextContent);
    const currentJsonString = JSON.stringify(editor.getJSON());
    if (nextJsonString && nextJsonString === currentJsonString) return;
    if (!nextJsonString && editor.getHTML() === (contentHtml || '<p></p>')) return;
    editor.commands.setContent(nextContent || '', { emitUpdate: false });
  }, [contentHtml, contentJson, editor]);

  if (!editor) return null;

  function insertToken(token: string) {
    editor?.chain().focus().insertContent(token).run();
  }

  function insertTable() {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Label' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph' }] },
              { type: 'tableCell', content: [{ type: 'paragraph' }] },
            ],
          },
        ],
      })
      .run();
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">
        <div className="group/editor overflow-hidden rounded-lg border border-neutral-200 bg-surface transition-colors focus-within:border-primary/40">
          <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-100 bg-surface-subtle/60 px-2 py-1">
            <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold className="size-3.5" />} label="Bold" />
            <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic className="size-3.5" />} label="Italic" />
            <div className="mx-1 h-4 w-px bg-neutral-200" />
            <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 className="size-3.5" />} label="Heading 2" />
            <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} icon={<Heading3 className="size-3.5" />} label="Heading 3" />
            <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<List className="size-3.5" />} label="Bullet list" />
            <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={<ListOrdered className="size-3.5" />} label="Ordered list" />
            <div className="mx-1 h-4 w-px bg-neutral-200" />
            <ToolbarButton onClick={insertTable} icon={<Table className="size-3.5" />} label="Insert table" />
            <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: 'pageBreak' }).run()} icon={<WrapText className="size-3.5" />} label="Insert page break" />
            <ToolbarButton onClick={() => {
              const previousUrl = editor.getAttributes('link').href as string | undefined;
              const url = window.prompt('URL', previousUrl ?? '');
              if (url === null) return;
              if (!url.trim()) editor.chain().focus().unsetLink().run();
              else editor.chain().focus().setLink({ href: url.trim() }).run();
            }} icon={<Link className="size-3.5" />} label="Link" />
            <div className="flex-1" />
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={<Undo2 className="size-3.5" />} label="Undo" />
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={<Redo2 className="size-3.5" />} label="Redo" />
          </div>
          <EditorContent editor={editor} style={{ minHeight }} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>Insert variable</ContextMenuLabel>
        {groupedTokens().map((group) => (
          <ContextMenuSub key={group.group}>
            <ContextMenuSubTrigger>{group.group}</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {group.tokens.map((token) => (
                <ContextMenuItem key={token.token} onSelect={() => insertToken(token.token)}>
                  {token.label}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ))}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => editor.chain().focus().insertContent({ type: 'pageBreak' }).run()}>
          Page break
        </ContextMenuItem>
        <ContextMenuItem onSelect={insertTable}>Table</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ToolbarButton({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  readonly active?: boolean;
  readonly onClick: () => void;
  readonly icon: ReactNode;
  readonly label: string;
  readonly disabled?: boolean;
}) {
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
        active ? 'bg-primary-ghost text-primary' : 'text-neutral-500 hover:bg-surface hover:text-neutral-900',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      )}
    >
      {icon}
    </button>
  );
}
