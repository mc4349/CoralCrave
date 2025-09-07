// Service Worker Registration for PWA
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('Service Worker registered successfully:', registration.scope)

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, notify user
              showUpdateNotification()
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from service worker:', event.data)
      })

    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  } else {
    console.log('Service Worker not supported in this browser')
  }
}

const showUpdateNotification = () => {
  // Create a simple update notification
  const notification = document.createElement('div')
  notification.className = 'fixed top-4 right-4 bg-cyan-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm'
  notification.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <h4 class="font-semibold">Update Available</h4>
        <p class="text-sm">A new version is available. Refresh to update.</p>
      </div>
      <button id="update-btn" class="ml-4 bg-cyan-600 hover:bg-cyan-700 px-3 py-1 rounded text-sm font-medium">
        Update
      </button>
    </div>
  `

  document.body.appendChild(notification)

  // Handle update button click
  document.getElementById('update-btn')?.addEventListener('click', () => {
    window.location.reload()
  })

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 10000)
}

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.unregister()
      console.log('Service Worker unregistered')
    } catch (error) {
      console.error('Service Worker unregistration failed:', error)
    }
  }
}

// Check if app is running in standalone mode (PWA)
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true
}

// Request notification permission
export const requestNotificationPermission = async () => {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        console.log('Notification permission granted')
        return true
      } else {
        console.log('Notification permission denied')
        return false
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }
  return false
}
