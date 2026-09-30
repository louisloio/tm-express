import { useEffect, useRef, useState } from 'react'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Ticks while `target` (an ISO timestamp) is in the future, and calls
 * `onExpire` once when it passes. Ticks every minute while there's more
 * than a day left (the display only shows days/hours then, so per-second
 * updates would be wasted renders) and switches to every second once under
 * a day, so the hours/minutes/seconds display stays live. Returns the
 * remaining milliseconds (0 once expired or when there's no target).
 */
export function useCountdown(target: string | null | undefined, onExpire?: () => void): number {
  const [remaining, setRemaining] = useState(() =>
    target ? new Date(target).getTime() - Date.now() : 0,
  )
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!target) {
      setRemaining(0)
      return
    }
    const targetMs = new Date(target).getTime()
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const left = targetMs - Date.now()
      setRemaining(Math.max(0, left))
      if (left <= 0) {
        onExpireRef.current?.()
        return
      }
      timer = setTimeout(tick, left < DAY_MS ? 1000 : 60_000)
    }
    tick()

    return () => clearTimeout(timer)
  }, [target])

  return Math.max(0, remaining)
}

/** True once a countdown has less than a day left — used to call out urgency (e.g. blinking). */
export function isCountdownUrgent(ms: number): boolean {
  return ms > 0 && ms < DAY_MS
}

/** "2d 14h" with a day or more left, "05h 23m 09s" once under a day. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  if (ms >= DAY_MS) return `${days}d ${hours}h`
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}
