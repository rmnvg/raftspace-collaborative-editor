"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Pilcrow,
  Undo2,
  Redo2,
  type LucideIcon,
} from "lucide-react";
import type { TiptapDocument } from "@/types/document";

interface RichTextEditorProps {
  initialContent: TiptapDocument;
  editable: boolean;
  onChange?: (content: TiptapDocument) => void;
}

export function RichTextEditor({ initialContent, editable, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2] } }), Underline],
    content: initialContent as unknown as Record<string, unknown>,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: updatedEditor }) => {
      onChange?.(updatedEditor.getJSON() as unknown as TiptapDocument);
    },
    editorProps: {
      attributes: {
        class: "min-h-[24rem] px-4 py-6 outline-none sm:px-8",
      },
    },
  });

  if (!editor) return null;

  return (
    <div>
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

interface ToolbarButtonConfig {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

function Toolbar({ editor }: { editor: Editor }) {
  const buttons: ToolbarButtonConfig[] = [
    {
      label: "Paragraph",
      icon: Pilcrow,
      isActive: editor.isActive("paragraph"),
      onClick: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: "Heading 1",
      icon: Heading1,
      isActive: editor.isActive("heading", { level: 1 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "Heading 2",
      icon: Heading2,
      isActive: editor.isActive("heading", { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Bold",
      icon: BoldIcon,
      isActive: editor.isActive("bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: ItalicIcon,
      isActive: editor.isActive("italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      icon: UnderlineIcon,
      isActive: editor.isActive("underline"),
      onClick: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Bulleted list",
      icon: List,
      isActive: editor.isActive("bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      isActive: editor.isActive("orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2"
    >
      {buttons.map(({ label, icon: Icon, isActive, onClick }) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={isActive}
          // Without this, the button's own mousedown default action steals
          // focus from the ProseMirror editor before onClick ever runs, so
          // editor.chain().focus() loses the race and typed text is lost.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
          className={
            isActive
              ? "rounded-md bg-indigo-100 p-1.5 text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              : "rounded-md p-1.5 text-slate-600 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          }
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}

      <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />

      <button
        type="button"
        title="Undo"
        aria-label="Undo"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Undo2 className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Redo"
        aria-label="Redo"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Redo2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
