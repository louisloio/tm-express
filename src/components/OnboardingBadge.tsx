import type { OnboardingStatus } from '../types/database'

export function OnboardingBadge({ status }: { status: OnboardingStatus }) {
  const isApproved = status === 'Approved'
  return (
    <span
      className={`w-fit shrink-0 self-start rounded px-1 py-0.5 text-[12px] font-medium tracking-[-0.312px] ${
        isApproved ? 'bg-success-bg text-success-text' : 'bg-warning-bg text-warning-text'
      }`}
    >
      {status}
    </span>
  )
}
