import { create } from 'zustand'
import { api } from '@/mock/api'
import type { Farm, FarmBundle, Notification, Plant, PropertyOperation, TeamRole } from '@/mock/types'

export interface RecalcState {
  active: boolean
  startedAt: number | null
  finishedAt: number | null
  /** Operations that triggered the run — the honest "updated because" trail. */
  operations: PropertyOperation[]
  origin: 'auto' | 'manual'
}

interface FarmState {
  bundle: FarmBundle | null
  loading: boolean
  error: Error | null
  recalc: RecalcState
  notifications: Notification[]

  loadFarm: (farmId: string) => Promise<void>
  refreshFarm: (farmId: string) => Promise<void>
  /** Edit one or more plant properties → change log → recalculation. */
  patchPlant: (plantId: string, patch: Partial<Plant>) => Promise<void>
  addPlant: (farmId: string, input: Omit<Plant, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  deletePlant: (plantId: string) => Promise<void>
  patchFarm: (farmId: string, patch: Partial<Farm>) => Promise<void>
  regenerate: (farmId: string) => Promise<void>
  inviteMember: (farmId: string, input: { email: string; role: TeamRole; message: string }) => Promise<void>
  respondToInvite: (membershipId: string, decision: 'accepted' | 'rejected') => Promise<void>
  revokeMember: (membershipId: string) => Promise<void>
  changeMemberRole: (membershipId: string, role: TeamRole) => Promise<void>
  loadNotifications: () => Promise<void>
  markNotificationsRead: () => Promise<void>
  resetRecalc: () => void
}

const idleRecalc: RecalcState = { active: false, startedAt: null, finishedAt: null, operations: [], origin: 'auto' }

export const useFarm = create<FarmState>((set, get) => ({
  bundle: null,
  loading: false,
  error: null,
  recalc: idleRecalc,
  notifications: [],

  loadFarm: async (farmId) => {
    if (get().bundle?.farm.id !== farmId) set({ bundle: null, loading: true, error: null, recalc: idleRecalc })
    else set({ loading: true, error: null })
    try {
      const bundle = await api.getFarmBundle(farmId)
      set({ bundle, loading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error : new Error(String(error)), loading: false })
    }
  },

  refreshFarm: async (farmId) => {
    const bundle = await api.getFarmBundle(farmId)
    set({ bundle })
  },

  patchPlant: async (plantId, patch) => {
    set({ recalc: { active: true, startedAt: Date.now(), finishedAt: null, operations: [], origin: 'auto' } })
    try {
      const { bundle, operations } = await api.updatePlant(plantId, patch)
      set({
        bundle,
        recalc: { active: false, startedAt: null, finishedAt: Date.now(), operations, origin: 'auto' },
      })
    } catch (error) {
      set({
        recalc: { ...get().recalc, active: false },
        error: error instanceof Error ? error : new Error(String(error)),
      })
      throw error
    }
  },

  addPlant: async (farmId, input) => {
    set({ recalc: { active: true, startedAt: Date.now(), finishedAt: null, operations: [], origin: 'auto' } })
    try {
      const bundle = await api.addPlant(farmId, input)
      const ops = bundle.operations.slice(0, 1)
      set({ bundle, recalc: { active: false, startedAt: null, finishedAt: Date.now(), operations: ops, origin: 'auto' } })
    } catch (error) {
      set({ recalc: { ...get().recalc, active: false } })
      throw error
    }
  },

  deletePlant: async (plantId) => {
    set({ recalc: { active: true, startedAt: Date.now(), finishedAt: null, operations: [], origin: 'auto' } })
    const bundle = await api.deletePlant(plantId)
    set({
      bundle,
      recalc: { active: false, startedAt: null, finishedAt: Date.now(), operations: bundle.operations.slice(0, 1), origin: 'auto' },
    })
  },

  patchFarm: async (farmId, patch) => {
    set({ recalc: { active: true, startedAt: Date.now(), finishedAt: null, operations: [], origin: 'auto' } })
    const bundle = await api.updateFarm(farmId, patch)
    set({
      bundle,
      recalc: { active: false, startedAt: null, finishedAt: Date.now(), operations: bundle.operations.slice(0, 2), origin: 'auto' },
    })
  },

  regenerate: async (farmId) => {
    set({ recalc: { active: true, startedAt: Date.now(), finishedAt: null, operations: [], origin: 'manual' } })
    const bundle = await api.regenerateAdvice(farmId)
    set({
      bundle,
      recalc: { active: false, startedAt: null, finishedAt: Date.now(), operations: [], origin: 'manual' },
    })
  },

  inviteMember: async (farmId, input) => {
    await api.inviteMember(farmId, input)
    await get().refreshFarm(farmId)
  },

  respondToInvite: async (membershipId, decision) => {
    const membership = await api.respondToInvite(membershipId, decision)
    await get().loadNotifications()
    const current = get().bundle
    if (current && current.farm.id === membership.farmId) await get().refreshFarm(membership.farmId)
  },

  revokeMember: async (membershipId) => {
    const membership = await api.revokeMember(membershipId)
    await get().refreshFarm(membership.farmId)
  },

  changeMemberRole: async (membershipId, role) => {
    const membership = await api.changeMemberRole(membershipId, role)
    await get().refreshFarm(membership.farmId)
  },

  loadNotifications: async () => {
    const notifications = await api.listNotifications()
    set({ notifications })
  },

  markNotificationsRead: async () => {
    await api.markNotificationsRead()
    set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) })
  },

  resetRecalc: () => set({ recalc: idleRecalc }),
}))
