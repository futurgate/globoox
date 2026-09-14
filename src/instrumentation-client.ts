import posthog from 'posthog-js'
import * as Sentry from '@sentry/nextjs'
import { hasFreshAnalyticsConsent } from '@/lib/cookieConsent'
import { isLandingConsentPath } from '@/lib/landingConsentPath'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
  before_send: (event) => {
    if (
      isLandingConsentPath(window.location.pathname)
      && !hasFreshAnalyticsConsent()
    ) {
      return null
    }

    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
