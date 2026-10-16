import type { SVGProps } from 'react'

/* SF-Symbols-style glyphs: 24pt grid, rounded caps/joins, drawn in
 * currentColor so they take the tint / label color and work in dark mode. */

function Glyph({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
)

export const ChevronLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={2.4} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Glyph>
)

/** ellipsis.circle */
export const EllipsisCircleIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="8" cy="12" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="16" cy="12" r="0.9" fill="currentColor" stroke="none" />
  </Glyph>
)

/** plain ellipsis */
export const EllipsisIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph {...p}>
    <circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </Glyph>
)

/** envelope */
export const EnvelopeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M4 7.5l8 6 8-6" />
  </Glyph>
)

export const UploadIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={1.8} {...p}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </Glyph>
)

export const DocumentIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={1.7} {...p}>
    <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7z" />
    <path d="M14 3v4h4M9 13h6M9 17h6" />
  </Glyph>
)

export const CheckCircleFillIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path
      d="M7.5 12.5l3 3 6-6.5"
      fill="none"
      stroke="#fff"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={1.8} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Glyph>
)

export const HouseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={1.8} {...p}>
    <path d="M4 10.5 12 4l8 6.5" />
    <path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" />
    <path d="M10 20v-5h4v5" />
  </Glyph>
)

/** calendar */
export const CalendarIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={1.8} {...p}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </Glyph>
)

export const ChevronRightIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={2.4} {...p}>
    <path d="m9 5 7 7-7 7" />
  </Glyph>
)

export const CheckmarkIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={2.6} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Glyph>
)

export const ChecklistIcon = (p: SVGProps<SVGSVGElement>) => (
  <Glyph strokeWidth={1.8} {...p}>
    <path d="M9.5 6h10M9.5 12h10M9.5 18h10" />
    <path d="m4 6 1.2 1.2L7.5 5" />
    <path d="m4 12 1.2 1.2L7.5 11" />
    <path d="m4 18 1.2 1.2L7.5 17" />
  </Glyph>
)
