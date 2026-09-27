import type { MongoDocument } from './common';

export type HostApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface HostApplicationDocument extends MongoDocument {
  userId: string;
  orgName: string;
  category: string;
  expectedAttendees: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  message: string;
  status: HostApplicationStatus;
}
