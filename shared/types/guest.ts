import type { MongoDocument } from './common';

export interface GuestDocument extends MongoDocument {
  firebaseUid: string;
  email?: string;
  name: string;
  phone?: string;
  notes?: string;
  tags?: string[];
  role: 'guest' | 'host';
}
