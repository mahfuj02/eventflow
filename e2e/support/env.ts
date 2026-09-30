// Fixed set of real Firebase test accounts (see plan / README for setup
// steps). Firebase UIDs must be recorded manually after creating each
// account once, since there's no programmatic lookup path from an email
// alone without the Admin SDK (deliberately not used in this project).
function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set - see e2e/README.md for required test account setup`)
  }
  return value
}

export function firebaseApiKey(): string {
  return required('E2E_FIREBASE_API_KEY')
}

export const testAccounts = {
  guest: {
    email: process.env.E2E_GUEST_EMAIL || 'e2e-guest@test.eventflow.dev',
    password: () => required('E2E_GUEST_PASSWORD'),
  },
  host: {
    email: process.env.E2E_HOST_EMAIL || 'e2e-host@test.eventflow.dev',
    password: () => required('E2E_HOST_PASSWORD'),
    firebaseUid: () => required('E2E_HOST_FIREBASE_UID'),
  },
  pending: {
    email: process.env.E2E_PENDING_EMAIL || 'e2e-pending@test.eventflow.dev',
    password: () => required('E2E_PENDING_PASSWORD'),
    firebaseUid: () => required('E2E_PENDING_FIREBASE_UID'),
  },
}
