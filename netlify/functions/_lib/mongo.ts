import { MongoClient } from 'mongodb'

let clientPromise: Promise<MongoClient> | null = null

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('MONGODB_URI is not set')
    clientPromise = new MongoClient(uri).connect()
  }
  return clientPromise
}

export async function getDb() {
  const client = await getMongoClient()
  return client.db(process.env.MONGODB_DB_NAME || 'eventflow')
}
