import type { APIRequestContext } from '@playwright/test'

async function seed(request: APIRequestContext, body: Record<string, unknown>) {
  const response = await request.post('/.netlify/functions/test-seed', { data: body })
  if (!response.ok()) {
    throw new Error(`test-seed failed: ${response.status()} ${await response.text()}`)
  }
  return response.json()
}

export async function resetTestData(request: APIRequestContext): Promise<void> {
  await seed(request, { action: 'resetTestData' })
}

export async function seedGuest(
  request: APIRequestContext,
  input: { firebaseUid: string; email?: string; name: string; role: 'guest' | 'host' },
): Promise<void> {
  await seed(request, { action: 'createGuest', ...input })
}

export async function seedHostApplication(
  request: APIRequestContext,
  input: { userId: string; status: 'pending' | 'approved' | 'rejected' },
): Promise<{ _id: string }> {
  return seed(request, { action: 'createHostApplication', ...input })
}

export async function seedEventWithSales(
  request: APIRequestContext,
  input: { organizerId: string; endsInPast?: boolean },
): Promise<{ eventId: string; ticketTypeId: string }> {
  return seed(request, { action: 'createEventWithSales', ...input })
}
