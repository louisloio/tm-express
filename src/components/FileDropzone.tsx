import { useRef, useState } from 'react'
import { CheckCircleFillIcon, DocumentIcon, UploadIcon } from './icons'

interface FileDropzoneProps {
  file: File | null
  onChange: (file: File | null) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Click-to-browse or drag-and-drop file target. Empty: dashed drop area.
 * Filled: a solid green "attached" card with the file name, so it's obvious
 * a file is ready, plus Replace / Remove.
 */
export function FileDropzone({ file, onChange }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const dragProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const dropped = e.dataTransfer.files?.[0]
      if (dropped) onChange(dropped)
    },
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      onChange={(e) => {
        onChange(e.target.files?.[0] ?? null)
        e.target.value = ''
      }}
    />
  )

  if (file) {
    return (
      <div
        {...dragProps}
        className={`flex flex-col gap-3 rounded-[12px] border-[1.5px] px-4 py-3.5 transition-colors ${
          dragOver ? 'border-accent bg-fill' : 'border-success-text/40 bg-success-bg'
        }`}
      >
        <div className="flex items-center gap-3">
          <DocumentIcon width={32} height={32} className="shrink-0 text-success-text" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[16px] font-semibold text-text-primary">
              {file.name}
            </span>
            <span className="flex items-center gap-1 text-[13px] font-medium text-success-text">
              <CheckCircleFillIcon width={15} height={15} />
              File attached · {formatSize(file.size)}
            </span>
          </div>
        </div>
        <div className="flex gap-4 border-t-[0.5px] border-success-text/25 pt-2.5 text-[15px]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-accent active:opacity-60"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-medium text-danger-text active:opacity-60"
          >
            Remove
          </button>
        </div>
        {hiddenInput}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      {...dragProps}
      className={`flex w-full flex-col items-center gap-1.5 rounded-[12px] border-[1.5px] border-dashed px-4 py-6 text-center transition-colors ${
        dragOver
          ? 'border-accent bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
          : 'border-text-muted bg-fill'
      }`}
    >
      <UploadIcon width={28} height={28} className="text-accent" />
      <span className="text-[16px] font-medium text-accent">Choose a file</span>
      <span className="text-[13px] text-text-secondary">or drag and drop it here</span>
      {hiddenInput}
    </button>
  )
}
