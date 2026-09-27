import { ObjectId } from 'mongodb'
import type { EventDocument } from '../../shared/types/event'
import { getDb } from './_lib/mongo'
import { getStripe } from './_lib/stripe'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

interface CheckoutSessionBody {
  eventId?: unknown
  ticketTypeId?: unknown
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const body = (await req.json()) as CheckoutSessionBody

    if (typeof body.eventId !== 'string' || typeof body.ticketTypeId !== 'string') {
      return new Response('eventId and ticketTypeId are required', { status: 400 })
    }

    const db = await getDb()
    const events = db.collection<Omit<EventDocument, '_id'>>('events')
    const event = await events.findOne({ _id: new ObjectId(body.eventId) })

    if (!event) {
      return new Response('Event not found', { status: 404 })
    }

    const ticketType = event.ticketTypes.find((t) => t.id === body.ticketTypeId)
    if (!ticketType) {
      return new Response('Ticket type not found', { status: 404 })
    }

    if (ticketType.quantitySold >= ticketType.quantityTotal) {
      return new Response('Sold out', { status: 400 })
    }

    const origin = new URL(req.url).origin
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: ticketType.currency,
            unit_amount: ticketType.price,
            product_data: {
              name: `${event.title} — ${ticketType.name}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: origin,
      metadata: {
        eventId: body.eventId,
        ticketTypeId: body.ticketTypeId,
        guestId: user.uid,
      },
    })

    if (!session.url) {
      return new Response('Failed to create checkout session', { status: 500 })
    }

    return Response.json({ url: session.url })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('create-checkout-session failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
