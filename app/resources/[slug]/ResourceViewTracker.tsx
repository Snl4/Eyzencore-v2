'use client'

import { useEffect } from 'react'

export function ResourceViewTracker({ resourceId }: { resourceId: number }) {
  useEffect(() => {
    const storageKey = `eyzencore-resource-view:${resourceId}`
    try {
      if (sessionStorage.getItem(storageKey)) return
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // Storage can be unavailable in private/browser-restricted contexts.
    }
    void fetch(`/api/resources/${resourceId}/view`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
    }).catch(() => undefined)
  }, [resourceId])

  return null
}
