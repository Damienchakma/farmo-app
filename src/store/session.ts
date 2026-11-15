import { create } from 'zustand'
import { api } from '@/mock/api'
import { isGuestDemo, setGuestDemo } from '@/lib/guest'
import type { User } from '@/mock/types'

interface SessionState {
  user: User | null
  /** Users available to the demo switcher. */
  users: User[]
  status: 'idle' | 'loading' | 'ready'
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<User>
  signup: (input: { name: string; email: string; phone: string; password: string }) => Promise<{ user: User; code: string }>
  requestOtp: (email: string, purpose?: 'verify-email' | 'verify-phone' | 'reset') => Promise<string>
  verifyOtp: (email: string, code: string, purpose?: 'verify-email' | 'verify-phone' | 'reset') => Promise<User>
  completeReset: (email: string, code: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  switchUser: (userId: string) => Promise<User>
  deleteAccount: (userId: string) => Promise<void>
  updateProfile: (patch: Partial<Pick<User, 'name' | 'phone' | 'jobTitle'>>) => Promise<User>
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  users: [],
  status: 'idle',

  init: async () => {
    set({ status: 'loading' })
    const [user, users] = await Promise.all([api.currentUser(), api.listUsers()])
    set({ user, users, status: 'ready' })
  },

  login: async (email, password) => {
    const user = await api.login(email, password)
    set({ user, users: await api.listUsers() })
    return user
  },

  signup: async (input) => {
    const result = await api.signup(input)
    set({ user: result.user, users: await api.listUsers() })
    return result
  },

  requestOtp: (email, purpose = 'verify-email') => api.requestOtp(email, purpose),

  verifyOtp: async (email, code, purpose = 'verify-email') => {
    const user = await api.verifyOtp(email, code, purpose)
    set({ user, users: await api.listUsers() })
    return user
  },

  completeReset: async (email, code, password) => {
    await api.completePasswordReset(email, code, password)
  },

  signOut: async () => {
    if (isGuestDemo) {
      setGuestDemo(false)
      return
    }
    await api.signOut()
    set({ user: null })
  },

  switchUser: async (userId) => {
    const user = await api.switchUser(userId)
    set({ user })
    return user
  },

  deleteAccount: async (userId) => {
    await api.deleteAccount(userId)
    const [user, users] = await Promise.all([api.currentUser(), api.listUsers()])
    if (isGuestDemo && !user) {
      setGuestDemo(false)
      return
    }
    set({ user, users })
  },

  updateProfile: async (patch) => {
    const user = await api.updateProfile(patch)
    set({ user, users: await api.listUsers() })
    return user
  },
}))

export function currentUserSnapshot(): User | null {
  return useSession.getState().user
}
