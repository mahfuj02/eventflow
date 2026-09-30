import type { EventDocument, TicketType } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import type { HostApplicationDocument, HostApplicationStatus } from '../../shared/types/hostApplication'
import type { OrderDocument } from '../../shared/types/order'
import type { TicketDocument } from '../../shared/types/ticket'
import { getDb } from './_lib/mongo'

// Only ever usable against a database name ending in _test - refuses to
// run against real data even if this function is accidentally deployed
// with production env vars. This is test infrastructure, not a general
// admin API: each action is narrow and specific to what the e2e suite
// actually needs to seed.
function assertTestDatabase() {
  const dbName = process.env.MONGODB_DB_NAME
  if (!dbName || !dbName.endsWith('_test')) {
    throw new Error('test-seed can only run against a database name ending in _test')
  }
}

interface CreateGuestBody {
  action: 'createGuest'
  firebaseUid: string
  email?: string
  name: string
  role: 'guest' | 'host'
}

interface CreateHostApplicationBody {
  action: 'createHostApplication'
  userId: string
  status: HostApplicationStatus
}

interface CreateEventWithSalesBody {
  action: 'createEventWithSales'
  organizerId: string
  endsInPast?: boolean
}

interface ResetTestDataBody {
  action: 'resetTestData'
}

type SeedBody = CreateGuestBody | CreateHostApplicationBody | CreateEventWithSalesBody | ResetTestDataBody

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    assertTestDatabase()
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'Forbidden', { status: 403 })
  }

  try {
    const body = (await req.json()) as SeedBody
    const db = await getDb()

    if (body.action === 'resetTestData') {
      await Promise.all([
        db.collection('events').deleteMany({}),
        db.collection('tickets').deleteMany({}),
        db.collection('orders').deleteMany({}),
        db.collection('guests').deleteMany({}),
        db.collection('hostApplications').deleteMany({}),
      ])
      return Response.json({ ok: true })
    }

    if (body.action === 'createGuest') {
      const now = new Date().toISOString()
      await db.collection<Omit<GuestDocument, '_id'>>('guests').updateOne(
        { firebaseUid: body.firebaseUid },
        {
          $set: { email: body.email, name: body.name, role: body.role, updatedAt: now },
          $setOnInsert: { firebaseUid: body.firebaseUid, createdAt: now },
        },
        { upsert: true },
      )
      return Response.json({ ok: true })
    }

    if (body.action === 'createHostApplication') {
      const now = new Date().toISOString()
      const application: Omit<HostApplicationDocument, '_id'> = {
        userId: body.userId,
        orgName: 'E2E Test Org',
        category: 'Music',
        expectedAttendees: 'Under 50',
        contactName: 'E2E Tester',
        role: 'Organizer',
        email: 'e2e-pending@test.eventflow.dev',
        phone: '000-000-0000',
        message: 'Seeded by e2e tests',
        status: body.status,
        createdAt: now,
        updatedAt: now,
        approvalToken: crypto.randomUUID(),
        approvalTokenUsed: false,
      }
      const result = await db
        .collection<Omit<HostApplicationDocument, '_id'>>('hostApplications')
        .insertOne(application)
      return Response.json({ _id: result.insertedId.toString() })
    }

    if (body.action === 'createEventWithSales') {
      const now = new Date()
      const dayMs = 24 * 60 * 60 * 1000
      const startsAt = body.endsInPast ? new Date(now.getTime() - 2 * dayMs) : new Date(now.getTime() + 7 * dayMs)
      const endsAt = body.endsInPast ? new Date(now.getTime() - 1 * dayMs) : new Date(now.getTime() + 7 * dayMs + 3 * 60 * 60 * 1000)

      // quantitySold is deliberately 2 (not 1): tests that check "reduce
      // quantityTotal below sold count" need at least one valid positive
      // integer that's still below the sold count (1 works, 0 doesn't -
      // it would just fail the separate "must be a positive integer"
      // check instead of the intended business rule).
      const ticketTypeId = crypto.randomUUID()
      const soldQuantity = 2
      const ticketTypes: TicketType[] = [
        { id: ticketTypeId, name: 'General', price: 2000, currency: 'usd', quantityTotal: 10, quantitySold: soldQuantity },
      ]
      const nowIso = now.toISOString()
      const event: Omit<EventDocument, '_id'> = {
        organizerId: body.organizerId,
        title: 'E2E Seeded Event',
        description: 'Seeded event with an existing sale',
        venue: 'Test Venue',
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status: 'published',
        ticketTypes,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      const eventResult = await db.collection<Omit<EventDocument, '_id'>>('events').insertOne(event)
      const eventId = eventResult.insertedId.toString()

      const order: Omit<OrderDocument, '_id'> = {
        guestId: 'e2e-seeded-guest',
        eventId,
        ticketTypeId,
        quantity: soldQuantity,
        amountTotal: ticketTypes[0].price * soldQuantity,
        currency: 'usd',
        status: 'paid',
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      const orderResult = await db.collection<Omit<OrderDocument, '_id'>>('orders').insertOne(order)

      const tickets = db.collection<Omit<TicketDocument, '_id'>>('tickets')
      for (let i = 0; i < soldQuantity; i++) {
        const ticket: Omit<TicketDocument, '_id'> = {
          orderId: orderResult.insertedId.toString(),
          eventId,
          ticketTypeId,
          guestId: 'e2e-seeded-guest',
          code: crypto.randomUUID(),
          status: 'valid',
          createdAt: nowIso,
          updatedAt: nowIso,
        }
        await tickets.insertOne(ticket)
      }

      return Response.json({ eventId, ticketTypeId })
    }

    return new Response('Unknown action', { status: 400 })
  } catch (err) {
    console.error('test-seed failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
