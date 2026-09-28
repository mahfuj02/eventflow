export interface TicketTypeBody {
  id?: unknown
  name?: unknown
  price?: unknown
  quantityTotal?: unknown
}

export interface EventFieldsBody {
  title?: unknown
  description?: unknown
  venue?: unknown
  category?: unknown
  imageUrl?: unknown
  startsAt?: unknown
  endsAt?: unknown
  ticketTypes?: TicketTypeBody[]
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function validateEventFields(body: EventFieldsBody): string | null {
  if (!isNonEmptyString(body.title)) return 'title is required'
  if (!isNonEmptyString(body.description)) return 'description is required'
  if (!isNonEmptyString(body.venue)) return 'venue is required'

  const startsAt = typeof body.startsAt === 'string' ? new Date(body.startsAt) : null
  const endsAt = typeof body.endsAt === 'string' ? new Date(body.endsAt) : null
  if (!startsAt || Number.isNaN(startsAt.getTime())) return 'startsAt must be a valid date'
  if (!endsAt || Number.isNaN(endsAt.getTime())) return 'endsAt must be a valid date'
  if (endsAt <= startsAt) return 'endsAt must be after startsAt'

  if (!Array.isArray(body.ticketTypes) || body.ticketTypes.length === 0) {
    return 'At least one ticket type is required'
  }
  for (const ticketType of body.ticketTypes) {
    if (!isNonEmptyString(ticketType.name)) return 'ticketTypes[].name is required'
    if (!isPositiveInteger(ticketType.price)) {
      return 'ticketTypes[].price must be a positive integer (cents)'
    }
    if (!isPositiveInteger(ticketType.quantityTotal)) {
      return 'ticketTypes[].quantityTotal must be a positive integer'
    }
  }

  return null
}
