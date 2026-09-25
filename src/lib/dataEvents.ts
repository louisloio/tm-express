/**
 * On wide screens the client list (Home) stays mounted beside the detail
 * pane, so detail pages tell it when data changed and it should refetch.
 */
const EVENT = 'tmx:data-changed'

export function notifyDataChanged() {
  window.dispatchEvent(new Event(EVENT))
}

export function onDataChanged(handler: () => void): () => void {
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
