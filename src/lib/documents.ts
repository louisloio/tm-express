import type { Document, DocType } from '../types/database'

/**
 * Whether `a` should be the slot's current document rather than `b`: the one
 * valid the longest (latest expiry), then the most recently uploaded. Not
 * upload order alone — a late, back-dated upload (August's PMI arriving in
 * October) must not displace the real current document. Mirrors the
 * ordering in reconcile_todos() (supabase/014_current_document_by_expiry.sql).
 */
export function isMoreCurrent(
  a: Pick<Document, 'expiry_date' | 'uploaded_at'>,
  b: Pick<Document, 'expiry_date' | 'uploaded_at'>,
): boolean {
  const ax = a.expiry_date ?? ''
  const bx = b.expiry_date ?? ''
  if (ax !== bx) return ax > bx
  return new Date(a.uploaded_at) > new Date(b.uploaded_at)
}

/** The current document per (parent, doc_type). */
export function latestDocsByParent(documents: Document[]): Map<string, Map<DocType, Document>> {
  const byParent = new Map<string, Map<DocType, Document>>()
  for (const doc of documents) {
    let byType = byParent.get(doc.parent_id)
    if (!byType) {
      byType = new Map()
      byParent.set(doc.parent_id, byType)
    }
    const existing = byType.get(doc.doc_type)
    if (!existing || isMoreCurrent(doc, existing)) {
      byType.set(doc.doc_type, doc)
    }
  }
  return byParent
}
