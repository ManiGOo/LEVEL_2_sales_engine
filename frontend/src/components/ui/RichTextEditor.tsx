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
  const savedRange = useRef<Range | null>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || ''
    }
  }, [value])

  function saveSelection() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
    }
  }

  function restoreSelection() {
    const sel = window.getSelection()
    if (!sel) return
    if (savedRange.current) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    } else if (ref.current) {
      ref.current.focus()
      const range = document.createRange()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  function sync() {
    onChange(ref.current?.innerHTML || '')
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus()
    restoreSelection()
    document.execCommand(cmd, false, arg)
    saveSelection()
    sync()
  }

  function clearFormat() {
    ref.current?.focus()
    restoreSelection()
    document.execCommand('formatBlock', false, 'P')
    document.execCommand('removeFormat')
    saveSelection()
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
        <button type="button" className="rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={clearFormat}>
          Clear
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={saveSelection}
        className="prose-rich px-3 py-2 text-sm text-white"
        style={{ minHeight }}
      />
    </div>
  )
}
