import { ObjectId } from 'mongodb'
import type { EventDocument } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import type { OrderDocument } from '../../shared/types/order'
import type { TicketDocument } from '../../shared/types/ticket'
import { getDb } from './_lib/mongo'
import { getStripe } from './_lib/stripe'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

function withStringId<T extends { _id: ObjectId }>({ _id, ...rest }: T) {
  return { _id: _id.toString(), ...rest }
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

    const existingOrder = await orders.findOne({ stripeCheckoutSessionId: sessionId })
    if (existingOrder) {
      const existingTicket = await tickets.findOne({ orderId: existingOrder._id.toString() })
      return Response.json({
        order: withStringId(existingOrder),
        ticket: existingTicket ? withStringId(existingTicket) : null,
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
      await guests.updateOne(
        { firebaseUid: user.uid },
        {
          $setOnInsert: {
            firebaseUid: user.uid,
            name: buyerEmail.split('@')[0],
            role: 'guest',
            createdAt: nowIso,
          },
          $set: { email: buyerEmail, updatedAt: nowIso },
        },
        { upsert: true },
      )
    }

    const eventId = session.metadata.eventId
    const ticketTypeId = session.metadata.ticketTypeId
    const event = await events.findOne({ _id: new ObjectId(eventId) })
    const ticketType = event?.ticketTypes.find((t) => t.id === ticketTypeId)
    if (!event || !ticketType) {
      return new Response('Event or ticket type no longer exists', { status: 404 })
    }

    const now = new Date().toISOString()
    const order: Omit<OrderDocument, '_id'> = {
      guestId: user.uid,
      eventId,
      ticketTypeId,
      quantity: 1,
      amountTotal: session.amount_total ?? ticketType.price,
      currency: ticketType.currency,
      status: 'paid',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      createdAt: now,
      updatedAt: now,
    }
    const orderResult = await orders.insertOne(order)

    await events.updateOne(
      { _id: new ObjectId(eventId), 'ticketTypes.id': ticketTypeId },
      { $inc: { 'ticketTypes.$.quantitySold': 1 } },
    )

    const ticket: Omit<TicketDocument, '_id'> = {
      orderId: orderResult.insertedId.toString(),
      eventId,
      ticketTypeId,
      guestId: user.uid,
      code: crypto.randomUUID(),
      status: 'valid',
      createdAt: now,
      updatedAt: now,
    }
    const ticketResult = await tickets.insertOne(ticket)

    return Response.json({
      order: { ...order, _id: orderResult.insertedId.toString() },
      ticket: { ...ticket, _id: ticketResult.insertedId.toString() },
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('confirm-order failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
