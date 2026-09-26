'use client'

import { useSyncCheck } from '@/lib/hooks/useSyncCheck'

export default function SyncCheckClient() {
  // Each cache validates/migrates its own records. A catalog upgrade must not
  // erase offline chapters or unsent Reader anchors from the shared stores.
  useSyncCheck()
  return null
}
