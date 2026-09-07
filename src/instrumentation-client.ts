import posthog from 'posthog-js'
import * as Sentry from '@sentry/nextjs'
import { hasFreshAnalyticsConsent } from '@/lib/cookieConsent'

const LANDING_PATH = /^\/(?:landing|(?:en|es|fr|ru)(?:\/landing)?)\/?$/

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
  person_profiles: 'always',
  before_send: (event) => {
    if (
      LANDING_PATH.test(window.location.pathname)
      && !hasFreshAnalyticsConsent()
    ) {
      return null
    }

    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
