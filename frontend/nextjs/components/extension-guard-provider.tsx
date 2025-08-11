'use client'

import { useEffect } from 'react'

/**
 * Extension Guard Provider - Initializes protection against Chrome extension interference
 * 
 * This component prevents browser extensions from causing network errors and console spam
 * by setting up global error handlers and request interceptors.
 */
export function ExtensionGuardProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cleanup: (() => void) | undefined

    const setup = async () => {
      try {
        const mod = await import('@/lib/extension-guard')
        mod.initializeExtensionGuard()
        cleanup = mod.cleanupExtensionGuard
      } catch (err) {
        // Ignore if module not found in certain builds
        // eslint-disable-next-line no-console
        console.warn('Extension guard unavailable:', err)
      }
    }

    setup()

    return () => {
      try {
        cleanup?.()
      } catch {
        // no-op
      }
    }
  }, [])

  return <>{children}</>
}
