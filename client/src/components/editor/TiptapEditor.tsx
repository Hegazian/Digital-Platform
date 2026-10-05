"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading1, Heading2, Quote, Undo, Redo } from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const toggleStyle = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    action();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 rounded-t-md dark:bg-gray-800 dark:border-gray-700">
      <button
        onClick={toggleStyle(() => editor.chain().focus().toggleBold().run())}
        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}
        title="Bold"
      >
        <Bold size={18} />
      </button>
      <button
        onClick={toggleStyle(() => editor.chain().focus().toggleItalic().run())}
        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}
        title="Italic"
      >
        <Italic size={18} />
      </button>
      <button
        onClick={toggleStyle(() => editor.chain().focus().toggleStrike().run())}
        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('strike') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}
        title="Strikethrough"
      >
        <Strikethrough size={18} />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1 dark:bg-gray-600" />
      <button
        onClick={toggleStyle(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}
        title="Heading 1"
      >
        <Heading1 size={18} />
      </button>
      <button
        onClick={toggleStyle(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}
        title="Heading 2"
      >
        <Heading2 size={18} />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1 dark:bg-gray-600" />
      <button
        onClick={toggleStyle(() => editor.chain().focus().toggleBulletList().run())}
        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}
        title="Bullet List"
      >
        <List size={18} />
      </button>
      <button
        onClick={toggleStyle(() => editor.chain().focus().toggleOrderedList().run())}
        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}
        title="Ordered List"
      >
        <ListOrdered size={18} />
      </button>
      <button
        onClick={toggleStyle(() => editor.chain().focus().toggleBlockquote().run())}
        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}
        title="Quote"
      >
        <Quote size={18} />
      </button>
      <div className="flex-1" />
      <button
        onClick={toggleStyle(() => editor.chain().focus().undo().run())}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        title="Undo"
      >
        <Undo size={18} />
      </button>
      <button
        onClick={toggleStyle(() => editor.chain().focus().redo().run())}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        title="Redo"
      >
        <Redo size={18} />
      </button>
    </div>
  );
};

export default function TiptapEditor({ content, onChange, placeholder = "Write something amazing..." }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none dark:prose-invert max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border border-gray-300 rounded-md shadow-sm overflow-hidden dark:border-gray-700 bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <MenuBar editor={editor} />
      <div className="min-h-[200px] cursor-text" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
