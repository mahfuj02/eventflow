import { Resend } from 'resend'

let client: Resend | null = null

export function getResend(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not set')
    client = new Resend(apiKey)
  }
  return client
}

// Resend's shared test sender - works immediately on the free tier,
// no domain verification needed.
export const NOTIFICATION_FROM = 'EventFlow <onboarding@resend.dev>'
