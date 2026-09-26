import type { MongoDocument } from './common';

export type TicketStatus = 'valid' | 'checked_in' | 'cancelled';

export interface TicketDocument extends MongoDocument {
  orderId: string;
  eventId: string;
  ticketTypeId: string;
  guestId: string;
  code: string;
  status: TicketStatus;
  checkedInAt?: string;
}
