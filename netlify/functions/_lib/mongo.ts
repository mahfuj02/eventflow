import { MongoClient } from 'mongodb'

let clientPromise: Promise<MongoClient> | null = null

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('MONGODB_URI is not set')
    // maxIdleTimeMS: this client is cached for the life of the process
    // (see below), so a pooled connection can sit unused for a while
    // between requests - long enough for a network intermediary (cloud
    // NAT/firewall) to silently drop it without telling the driver. The
    // next request on that now-dead connection then just hangs. Closing
    // and replacing idle connections after 20s keeps the pool from ever
    // holding one that stale.
    clientPromise = new MongoClient(uri, { maxIdleTimeMS: 20_000 }).connect()
  }
  return clientPromise
}

export async function getDb() {
  const client = await getMongoClient()
  return client.db(process.env.MONGODB_DB_NAME || 'eventflow')
}
