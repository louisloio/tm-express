import type { Document, DocType } from '../types/database'

/** The current document per (parent, doc_type) — most recently uploaded wins. */
export function latestDocsByParent(documents: Document[]): Map<string, Map<DocType, Document>> {
  const byParent = new Map<string, Map<DocType, Document>>()
  for (const doc of documents) {
    let byType = byParent.get(doc.parent_id)
    if (!byType) {
      byType = new Map()
      byParent.set(doc.parent_id, byType)
    }
    const existing = byType.get(doc.doc_type)
    if (!existing || new Date(doc.uploaded_at) > new Date(existing.uploaded_at)) {
      byType.set(doc.doc_type, doc)
    }
  }
  return byParent
}
