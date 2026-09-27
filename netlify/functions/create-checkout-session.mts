import { ObjectId } from 'mongodb'
import type { EventDocument } from '../../shared/types/event'
import { getDb } from './_lib/mongo'
import { getStripe } from './_lib/stripe'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

interface CheckoutItemBody {
  ticketTypeId?: unknown
  quantity?: unknown
}

interface CheckoutSessionBody {
  eventId?: unknown
  items?: CheckoutItemBody[]
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const body = (await req.json()) as CheckoutSessionBody

    if (typeof body.eventId !== 'string' || !Array.isArray(body.items) || body.items.length === 0) {
      return new Response('eventId and at least one item are required', { status: 400 })
    }

    const db = await getDb()
    const events = db.collection<Omit<EventDocument, '_id'>>('events')
    const event = await events.findOne({ _id: new ObjectId(body.eventId) })

    if (!event) {
      return new Response('Event not found', { status: 404 })
    }

    const items: { ticketTypeId: string; quantity: number }[] = []
    const lineItems: Array<{
      price_data: {
        currency: string
        unit_amount: number
        product_data: { name: string }
      }
      quantity: number
    }> = []

    for (const item of body.items) {
      if (typeof item.ticketTypeId !== 'string' || !isPositiveInteger(item.quantity)) {
        return new Response('Each item needs a ticketTypeId and a positive quantity', { status: 400 })
      }

      const ticketType = event.ticketTypes.find((t) => t.id === item.ticketTypeId)
      if (!ticketType) {
        return new Response('Ticket type not found', { status: 404 })
      }

      const remaining = ticketType.quantityTotal - ticketType.quantitySold
      if (item.quantity > remaining) {
        return new Response(`Only ${remaining} left for ${ticketType.name}`, { status: 400 })
      }

      items.push({ ticketTypeId: item.ticketTypeId, quantity: item.quantity })
      lineItems.push({
        price_data: {
          currency: ticketType.currency,
          unit_amount: ticketType.price,
          product_data: {
            name: `${event.title} — ${ticketType.name}`,
          },
        },
        quantity: item.quantity,
      })
    }

    const origin = new URL(req.url).origin
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: origin,
      metadata: {
        eventId: body.eventId,
        guestId: user.uid,
        items: JSON.stringify(items),
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
