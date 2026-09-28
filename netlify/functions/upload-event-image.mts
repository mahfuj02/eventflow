import type { GuestDocument } from '../../shared/types/guest'
import { getCloudinary } from './_lib/cloudinary'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const db = await getDb()
    const guests = db.collection<Omit<GuestDocument, '_id'>>('guests')
    const guest = await guests.findOne({ firebaseUid: user.uid })
    if (guest?.role !== 'host') {
      return new Response('You must be an approved host to upload images', { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return new Response('file is required', { status: 400 })
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return new Response('Please choose a JPG, PNG, or WEBP image', { status: 400 })
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return new Response('Image must be 5MB or smaller', { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`

    const cloudinary = getCloudinary()
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `event-banners/${user.uid}`,
      public_id: crypto.randomUUID(),
    })

    return Response.json({ url: result.secure_url })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('upload-event-image failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
