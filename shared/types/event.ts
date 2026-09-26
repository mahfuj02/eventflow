import type { MongoDocument } from './common';

export type EventStatus = 'draft' | 'published' | 'cancelled';

export interface TicketType {
  id: string;
  name: string;
  price: number;
  currency: string;
  quantityTotal: number;
  quantitySold: number;
}

export interface EventDocument extends MongoDocument {
  hostId: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  imageUrl?: string;
  ticketTypes: TicketType[];
}
