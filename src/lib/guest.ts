export const GUEST_STORAGE_PREFIX = 'farmo.guest.'

export const isGuestDemo = (() => {
  try {
    return sessionStorage.getItem(`${GUEST_STORAGE_PREFIX}active`) === '1'
  } catch {
    return false
  }
})()

export function setGuestDemo(enabled: boolean): void {
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(GUEST_STORAGE_PREFIX)) sessionStorage.removeItem(key)
  }
  if (enabled) sessionStorage.setItem(`${GUEST_STORAGE_PREFIX}active`, '1')
  // Reload so API selection and in-memory stores never cross session boundaries.
  window.location.replace(enabled ? '/projects' : '/login')
}
