import { ObjectId } from 'mongodb'
import type { EventDocument } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import type { OrderDocument } from '../../shared/types/order'
import type { TicketDocument } from '../../shared/types/ticket'
import { getDb } from './_lib/mongo'
import { getResend, NOTIFICATION_FROM } from './_lib/resend'
import { getStripe } from './_lib/stripe'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

function withStringId<T extends { _id: ObjectId }>({ _id, ...rest }: T) {
  return { _id: _id.toString(), ...rest }
}

interface SessionItem {
  ticketTypeId: string
  quantity: number
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const sessionId = new URL(req.url).searchParams.get('session_id')
    if (!sessionId) {
      return new Response('session_id is required', { status: 400 })
    }

    const db = await getDb()
    const orders = db.collection<Omit<OrderDocument, '_id'>>('orders')
    const tickets = db.collection<Omit<TicketDocument, '_id'>>('tickets')
    const events = db.collection<Omit<EventDocument, '_id'>>('events')

    const existingOrders = await orders.find({ stripeCheckoutSessionId: sessionId }).toArray()
    if (existingOrders.length > 0) {
      const orderIds = existingOrders.map((o) => o._id.toString())
      const existingTickets = await tickets.find({ orderId: { $in: orderIds } }).toArray()
      return Response.json({
        orders: existingOrders.map(withStringId),
        tickets: existingTickets.map(withStringId),
      })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return new Response('Payment not completed', { status: 402 })
    }
    if (session.metadata?.guestId !== user.uid) {
      return new Response('This order does not belong to you', { status: 403 })
    }

    const buyerEmail = session.customer_details?.email
    if (buyerEmail) {
      // Upsert defensively (matches sync-guest.mts's shape) in case this
      // runs before the guest doc otherwise would have been created.
      const guests = db.collection<Omit<GuestDocument, '_id'>>('guests')
      const nowIso = new Date().toISOString()

      // sync-guest.mts writes the literal 'Guest' placeholder for anonymous
      // checkout users before their email is known. Once we learn it here,
      // upgrade that placeholder too - otherwise the nav shows "Guest"
      // forever even after a real purchase. A real account's existing name
      // (a proper name or Google display name) is left untouched.
      const existingGuest = await guests.findOne({ firebaseUid: user.uid })
      const shouldSetName = !existingGuest || existingGuest.name === 'Guest'

      await guests.updateOne(
        { firebaseUid: user.uid },
        {
          $setOnInsert: {
            firebaseUid: user.uid,
            role: 'guest',
            createdAt: nowIso,
          },
          $set: {
            email: buyerEmail,
            updatedAt: nowIso,
            ...(shouldSetName ? { name: buyerEmail.split('@')[0] } : {}),
          },
        },
        { upsert: true },
      )
    }

    const eventId = session.metadata.eventId
    const items = JSON.parse(session.metadata.items ?? '[]') as SessionItem[]
    const event = await events.findOne({ _id: new ObjectId(eventId) })
    if (!event || items.length === 0) {
      return new Response('Event no longer exists', { status: 404 })
    }

    const now = new Date().toISOString()
    const createdOrders: OrderDocument[] = []
    const createdTickets: TicketDocument[] = []

    for (const item of items) {
      const ticketType = event.ticketTypes.find((t) => t.id === item.ticketTypeId)
      if (!ticketType) continue

      const order: Omit<OrderDocument, '_id'> = {
        guestId: user.uid,
        eventId,
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        amountTotal: ticketType.price * item.quantity,
        currency: ticketType.currency,
        status: 'paid',
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
        createdAt: now,
        updatedAt: now,
      }
      const orderResult = await orders.insertOne(order)
      createdOrders.push({ ...order, _id: orderResult.insertedId.toString() })

      await events.updateOne(
        { _id: new ObjectId(eventId), 'ticketTypes.id': item.ticketTypeId },
        { $inc: { 'ticketTypes.$.quantitySold': item.quantity } },
      )

      for (let i = 0; i < item.quantity; i++) {
        const ticket: Omit<TicketDocument, '_id'> = {
          orderId: orderResult.insertedId.toString(),
          eventId,
          ticketTypeId: item.ticketTypeId,
          guestId: user.uid,
          code: crypto.randomUUID(),
          status: 'valid',
          createdAt: now,
          updatedAt: now,
        }
        const ticketResult = await tickets.insertOne(ticket)
        createdTickets.push({ ...ticket, _id: ticketResult.insertedId.toString() })
      }
    }

    if (buyerEmail && createdTickets.length > 0) {
      try {
        const origin = new URL(req.url).origin
        const ticketTypeNameById = new Map(event.ticketTypes.map((t) => [t.id, t.name]))
        const ticketLines = createdTickets.map(
          (t) => `- ${ticketTypeNameById.get(t.ticketTypeId) ?? 'Ticket'}: ${t.code}`,
        )

        const sendResult = await getResend().emails.send({
          from: NOTIFICATION_FROM,
          to: buyerEmail,
          subject: `Your tickets for ${event.title}`,
          text: [
            `You're all set for ${event.title}!`,
            ``,
            `${event.venue} · ${new Date(event.startsAt).toLocaleString()}`,
            ``,
            `Your ticket code(s):`,
            ...ticketLines,
            ``,
            `View your tickets anytime at ${origin}/home`,
          ].join('\n'),
        })
        if (sendResult.error) {
          console.error('Failed to send purchase confirmation email:', sendResult.error)
        } else {
          console.log('Sent purchase confirmation email:', sendResult.data?.id)
        }
      } catch (err) {
        console.error('Failed to send purchase confirmation email:', err)
      }
    }

    return Response.json({ orders: createdOrders, tickets: createdTickets })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('confirm-order failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
