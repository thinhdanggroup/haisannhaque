'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init('phc_xxGtMGZTxhAnc5NAUamn2drA5eWPRJr7AftnX9NZznwp', {
      api_host: 'https://us.i.posthog.com',
      defaults: '2026-05-30',
      person_profiles: 'identified_only',
    })
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
