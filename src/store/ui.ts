import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger' | 'code'

export type ExperienceMode = 'farmer' | 'researcher'

const MODE_KEY = 'farmo.mode'

function readMode(): ExperienceMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'farmer' ? 'farmer' : 'researcher'
  } catch {
    return 'researcher'
  }
}

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  body?: string
  /** Monospaced payload, used for OTP codes and API keys. */
  code?: string
  ttl: number
}

interface UiState {
  toasts: Toast[]
  toast: (input: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }) => number
  dismissToast: (id: number) => void
  clearToasts: () => void

  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void

  devMenuOpen: boolean
  setDevMenuOpen: (open: boolean) => void

  /** Mobile navigation drawer. */
  navOpen: boolean
  setNavOpen: (open: boolean) => void

  inboxOpen: boolean
  setInboxOpen: (open: boolean) => void

  /** Farmer mode simplifies the farm view; researcher keeps the full detail. */
  mode: ExperienceMode
  setMode: (mode: ExperienceMode) => void

  /** Bumped after project/farm/account mutations so the sidebar re-lists projects. */
  dataVersion: number
  bumpDataVersion: () => void
}

let toastId = 0

export const useUi = create<UiState>((set, get) => ({
  toasts: [],

  toast: (input) => {
    const id = ++toastId
    const ttl = input.ttl ?? (input.code ? 12000 : 6500)
    set({ toasts: [...get().toasts, { ...input, id, ttl }] })
    if (ttl > 0) {
      window.setTimeout(() => get().dismissToast(id), ttl)
    }
    return id
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  clearToasts: () => set({ toasts: [] }),

  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),

  devMenuOpen: false,
  setDevMenuOpen: (devMenuOpen) => set({ devMenuOpen }),

  navOpen: false,
  setNavOpen: (navOpen) => set({ navOpen }),

  inboxOpen: false,
  setInboxOpen: (inboxOpen) => set({ inboxOpen }),

  mode: readMode(),
  setMode: (mode) => {
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch {
      /* private mode: keep the choice for this session only */
    }
    set({ mode })
  },

  dataVersion: 0,
  bumpDataVersion: () => set({ dataVersion: get().dataVersion + 1 }),
}))

/** Convenience for non-React call sites. */
export const toast = (input: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }) => useUi.getState().toast(input)

/** Convenience for non-React call sites: invalidate the sidebar project list. */
export const bumpDataVersion = () => useUi.getState().bumpDataVersion()
