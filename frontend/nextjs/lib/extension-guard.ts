/**
 * Extension Guard - Prevents Chrome extension requests from interfering with the app
 * 
 * This utility prevents browser extensions from causing network errors and console spam
 * by intercepting extension-related requests and errors.
 */

// List of known extension files that cause issues
const EXTENSION_FILES = [
  'extensionState.js',
  'heuristicsRedefinitions.js',
  'utils.js',
  'content-script.js',
  'inject.js'
]

// Function to check if a URL is an extension URL
export const isExtensionUrl = (url: string): boolean => {
  // Only block actual extension URLs, not relative API paths
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return false // These are legitimate relative URLs
  }
  
  return url.startsWith('chrome-extension://') || 
         url.startsWith('moz-extension://') || 
         url.startsWith('safari-extension://') ||
         EXTENSION_FILES.some(file => url.includes(file))
}

// Override console.error to filter extension errors
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// Set up error filtering
export const initializeExtensionGuard = () => {
  // Filter console errors related to extensions
  console.error = (...args: any[]) => {
    const message = args.join(' ')
    if (isExtensionUrl(message) || message.includes('net::ERR_FILE_NOT_FOUND')) {
      // Silently ignore extension-related errors
      return
    }
    originalConsoleError.apply(console, args)
  }

  console.warn = (...args: any[]) => {
    const message = args.join(' ')
    if (isExtensionUrl(message)) {
      // Silently ignore extension-related warnings
      return
    }
    originalConsoleWarn.apply(console, args)
  }

  // Global error handler for unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && typeof event.reason === 'object') {
        const error = event.reason
        if (error.message && isExtensionUrl(error.message)) {
          event.preventDefault() // Prevent the error from being logged
          return
        }
      }
    })

    // Global error handler for JavaScript errors
    window.addEventListener('error', (event) => {
      if (isExtensionUrl(event.filename || '')) {
        event.preventDefault() // Prevent the error from being logged
        return
      }
    })

    // Override fetch to block extension requests
    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      
      if (isExtensionUrl(url)) {
        // Return a mock response instead of making the request
        return Promise.resolve(new Response('{}', {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' }
        }))
      }
      
      return originalFetch.call(window, input, init)
    }

    // Block extension script loading
    const originalCreateElement = document.createElement
    document.createElement = function(tagName: string) {
      const element = originalCreateElement.call(document, tagName)
      
      if (tagName.toLowerCase() === 'script') {
        const scriptElement = element as HTMLScriptElement
        
        // Override src setter to block extension URLs
        let originalSrc = ''
        Object.defineProperty(scriptElement, 'src', {
          get() { return originalSrc },
          set(value: string) {
            if (isExtensionUrl(value)) {
              console.debug('Blocked extension script:', value)
              return // Don't set the src
            }
            originalSrc = value
            scriptElement.setAttribute('src', value)
          }
        })
      }
      
      return element
    }
  }
}

// Clean up function
export const cleanupExtensionGuard = () => {
  if (typeof window !== 'undefined') {
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  }
}
