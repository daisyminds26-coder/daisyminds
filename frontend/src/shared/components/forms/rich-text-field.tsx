import { useEffect } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Code, Italic, List, ListOrdered, Quote, Strikethrough } from 'lucide-react'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Toggle } from '@/shared/components/ui/toggle'
import { cn } from '@/shared/lib/utils'

interface RichTextFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  description?: string
  disabled?: boolean
}

interface ToolbarProps {
  editor: ReturnType<typeof useEditor>
  disabled?: boolean
}

/**
 * Only formatting the backend's `sanitizeLessonHtml` allowlist actually
 * keeps (SECURITY.md §Content Sanitization) — no toolbar button exists for
 * a mark/node the server would strip, so nothing here is a dead promise to
 * the admin.
 */
function Toolbar({ editor, disabled }: ToolbarProps) {
  const buttons: {
    label: string
    icon: typeof Bold
    isActive: boolean
    onToggle: () => void
  }[] = [
    {
      label: 'Bold',
      icon: Bold,
      isActive: editor.isActive('bold'),
      onToggle: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      isActive: editor.isActive('italic'),
      onToggle: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Strikethrough',
      icon: Strikethrough,
      isActive: editor.isActive('strike'),
      onToggle: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: 'Bulleted list',
      icon: List,
      isActive: editor.isActive('bulletList'),
      onToggle: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      isActive: editor.isActive('orderedList'),
      onToggle: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Code block',
      icon: Code,
      isActive: editor.isActive('codeBlock'),
      onToggle: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: 'Blockquote',
      icon: Quote,
      isActive: editor.isActive('blockquote'),
      onToggle: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ]

  return (
    <div className="border-input bg-muted/40 flex flex-wrap items-center gap-1 border-b p-1.5">
      {buttons.map(({ label, icon: Icon, isActive, onToggle }) => (
        <Toggle
          key={label}
          size="sm"
          pressed={isActive}
          disabled={disabled}
          aria-label={label}
          onPressedChange={onToggle}
        >
          <Icon className="size-3.5" />
        </Toggle>
      ))}
    </div>
  )
}

/**
 * A real Tiptap editor producing sanitized-allowlist-compatible HTML
 * (headings/paragraphs/bold/italic/lists/links/code-blocks/blockquotes) —
 * the backend re-sanitizes on every save regardless (`sanitizeLessonHtml`),
 * so this frontend allowlist is a UX nicety, never the security boundary.
 */
export function RichTextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  disabled,
}: RichTextFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <RichTextFieldInner
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          label={label}
          placeholder={placeholder}
          description={description}
          disabled={disabled}
        />
      )}
    />
  )
}

interface RichTextFieldInnerProps {
  value: string
  onChange: (html: string) => void
  onBlur: () => void
  label: string
  placeholder?: string
  description?: string
  disabled?: boolean
}

function RichTextFieldInner({
  value,
  onChange,
  onBlur,
  label,
  placeholder,
  description,
  disabled,
}: RichTextFieldInnerProps) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-40 p-3 focus:outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML())
    },
    onBlur: () => {
      onBlur()
    },
  })

  // Keep the editor in sync when the field value is reset externally (e.g. form reset after save/cancel).
  useEffect(() => {
    if (editor.getHTML() === value) return
    editor.commands.setContent(value, { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync on external value changes, not every editor identity change
  }, [value])

  useEffect(() => {
    editor.setEditable(!disabled)
  }, [editor, disabled])

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div
        className={cn('border-input overflow-hidden rounded-md border', disabled && 'opacity-60')}
      >
        <Toolbar editor={editor} disabled={disabled} />
        <FormControl>
          <EditorContent editor={editor} />
        </FormControl>
      </div>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  )
}
