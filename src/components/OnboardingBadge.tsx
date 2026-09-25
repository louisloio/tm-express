import type { OnboardingStatus } from '../types/database'

export function OnboardingBadge({ status }: { status: OnboardingStatus }) {
  const isApproved = status === 'Approved'
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-[3px] text-[12px] font-semibold leading-none tracking-normal ${
        isApproved ? 'bg-success-bg text-success-text' : 'bg-warning-bg text-warning-text'
      }`}
    >
      {status}
    </span>
  )
}
