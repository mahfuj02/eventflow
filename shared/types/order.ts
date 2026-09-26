import type { MongoDocument } from './common';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderDocument extends MongoDocument {
  guestId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  amountTotal: number;
  currency: string;
  status: OrderStatus;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}
