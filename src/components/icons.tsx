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
