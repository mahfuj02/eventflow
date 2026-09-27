import { ref } from 'vue'
import type { User } from 'firebase/auth'
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

const currentUser = ref<User | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onAuthStateChanged(auth, (user) => {
  currentUser.value = user
  loading.value = false
})

export function useAuth() {
  async function signUp(email: string, password: string) {
    error.value = null
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign up failed'
      throw err
    }
  }

  async function signIn(email: string, password: string) {
    error.value = null
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign in failed'
      throw err
    }
  }

  async function signInWithGoogle() {
    error.value = null
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Google sign in failed'
      throw err
    }
  }

  async function signOutUser() {
    await signOut(auth)
  }

  async function sendVerificationEmail() {
    if (!auth.currentUser) return
    await sendEmailVerification(auth.currentUser)
  }

  async function resetPassword(email: string) {
    error.value = null
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to send reset email'
      throw err
    }
  }

  async function signInAsGuest() {
    error.value = null
    try {
      await signInAnonymously(auth)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start guest checkout'
      throw err
    }
  }

  async function upgradeToAccount(email: string, password: string) {
    error.value = null
    if (!auth.currentUser) throw new Error('Not signed in')
    try {
      await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create account'
      throw err
    }
  }

  return {
    currentUser,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOutUser,
    sendVerificationEmail,
    resetPassword,
    signInAsGuest,
    upgradeToAccount,
  }
}
