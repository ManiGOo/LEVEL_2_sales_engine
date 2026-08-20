import { useEffect, useRef } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  className?: string
  minHeight?: number
}

export function RichTextEditor({ value, onChange, disabled, className, minHeight = 90 }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || ''
    }
  }, [value])

  function sync() {
    onChange(ref.current?.innerHTML || '')
  }

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg)
    ref.current?.focus()
    sync()
  }

  if (disabled) {
    return (
      <div
        className={`prose-rich ${className || ''}`}
        style={{ minHeight }}
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    )
  }

  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-800/70 ${className || ''}`}>
      <div className="flex flex-wrap gap-1 border-b border-slate-700 p-1.5">
        <button type="button" className="rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}>
          <b>B</b>
        </button>
        <button type="button" className="rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}>
          <i>I</i>
        </button>
        <button type="button" className="rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')}>
          <u>U</u>
        </button>
        <button type="button" className="rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')}>
          • List
        </button>
        <button type="button" className="rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')}>
          1. List
        </button>
        <button type="button" className="rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', 'H3')}>
          H
        </button>
        <button type="button" className="rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('removeFormat')}>
          Clear
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        className="prose-rich px-3 py-2 text-sm text-white"
        style={{ minHeight }}
      />
    </div>
  )
}
