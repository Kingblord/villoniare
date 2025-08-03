const CACHE_NAME = "villonaires-world-v2"
const STATIC_CACHE = "villonaires-static-v2"
const DYNAMIC_CACHE = "villonaires-dynamic-v2"

const urlsToCache = [
  "/",
  "/access",
  "/flash-store",
  "/flash-wallet",
  "/pin",
  "/about",
  "/admin",
  "/images/villonaires-logo.png",
  "/manifest.json",
  "/_next/static/css/app/layout.css",
  "/_next/static/chunks/webpack.js",
  "/_next/static/chunks/main.js",
]

// Install event - cache static resources
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("Caching static files")
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        console.log("Static files cached successfully")
        return self.skipWaiting()
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        console.log("Service Worker activated")
        return self.clients.claim()
      }),
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/")
          }
        })
    }),
  )
})

// Push notification event
self.addEventListener("push", (event) => {
  console.log("Push notification received")

  let notificationData = {
    title: "VillonairesWorld",
    body: "New notification from VillonairesWorld",
    icon: "/images/villonaires-logo.png",
    badge: "/images/villonaires-logo.png",
  }

  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() }
    } catch (e) {
      notificationData.body = event.data.text()
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: Math.random(),
      url: notificationData.url || "/flash-wallet",
    },
    actions: [
      {
        action: "open",
        title: "Open App",
        icon: "/images/villonaires-logo.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/images/villonaires-logo.png",
      },
    ],
    requireInteraction: true,
    silent: false,
    tag: notificationData.tag || "default",
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked")
  event.notification.close()

  if (event.action === "close") {
    return
  }

  const urlToOpen = event.notification.data?.url || "/flash-wallet"

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen)
            return client.focus()
          }
        }

        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      }),
  )
})

// Background sync event
self.addEventListener("sync", (event) => {
  console.log("Background sync triggered:", event.tag)

  if (event.tag === "background-sync") {
    event.waitUntil(
      // Perform background sync operations
      fetch("/api/sync")
        .then((response) => response.json())
        .then((data) => {
          console.log("Background sync completed:", data)
        })
        .catch((error) => {
          console.error("Background sync failed:", error)
        }),
    )
  }
})

// Message event - handle messages from main thread
self.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data)

  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body, ...options } = event.data.payload

    self.registration.showNotification(title, {
      body,
      icon: "/images/villonaires-logo.png",
      badge: "/images/villonaires-logo.png",
      ...options,
    })
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
  console.log("Periodic background sync:", event.tag)

  if (event.tag === "balance-update") {
    event.waitUntil(
      // Update wallet balances in background
      fetch("/api/balance-update")
        .then((response) => response.json())
        .then((data) => {
          console.log("Balance updated in background:", data)
        })
        .catch((error) => {
          console.error("Background balance update failed:", error)
        }),
    )
  }
})
