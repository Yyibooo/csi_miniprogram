import { runtimeConfig } from '../config/env'

let resolved = !runtimeConfig.authEnabled
let authSucceeded = resolved
let resolveReady: (success: boolean) => void = () => undefined
let readyPromise = new Promise<boolean>((resolve) => { resolveReady = resolve })

if (resolved) resolveReady(true)

export function markAuthReady(success: boolean): void {
  authSucceeded = success
  resolved = true
  resolveReady(success)
}

export function waitForAuth(): Promise<boolean> {
  return resolved ? Promise.resolve(authSucceeded) : readyPromise
}

export function resetAuth(): boolean {
  if (!runtimeConfig.authEnabled || !resolved) return false
  resolved = false
  authSucceeded = false
  readyPromise = new Promise<boolean>((resolve) => { resolveReady = resolve })
  return true
}
