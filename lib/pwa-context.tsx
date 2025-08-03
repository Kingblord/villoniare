"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { gtag } from "ga-gtag" // Import gtag from the appropriate package

interface PWAContextType {
  isStandalone: boolean
  isInstallable: boolean
  installPrompt: any
  installApp: () => Promise<void>
  isNotificationSupported: boolean
  isNotificationPermitted: boolean
  requestNotificationPermission: () => Promise<boolean>
  sendNotification: (title: string, body: string, options?: NotificationOptions) => void
  updateAvailable: boolean
  updateApp: () => void
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isNotificationSupported, setIsNotificationSupported] = useState(false)
  const [isNotificationPermitted, setIsNotificationPermitted] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Check if running as PWA (standalone mode)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://") ||
        window.location.search.includes("utm_source=homescreen")

      setIsStandalone(isStandaloneMode)
      console.log("Standalone mode:", isStandaloneMode)
    }

    // Check notification support
    const checkNotificationSupport = () => {
      const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
      setIsNotificationSupported(supported)

      if (supported) {
        setIsNotificationPermitted(Notification.permission === "granted")
      }
    }

    // Register service worker with enhanced features
    const registerSW = async () => {
      // Skip if another Service Worker (e.g. the v0 preview SW) is already controlling the page
      if (
        "serviceWorker" in navigator &&
        (!navigator.serviceWorker.controller || !navigator.serviceWorker.controller.scriptURL.includes("__v0_sw.js"))
      ) {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          })

          setRegistration(reg)
          console.log("Service Worker registered successfully")

          // Check for updates
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                }
              })
            }
          })

          // Listen for controlling service worker changes
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.location.reload()
          })

          // Register for background sync if supported
          if ("sync" in reg) {
            await reg.sync.register("background-sync")
          }

          // Register for periodic background sync if supported
          if ("periodicSync" in reg) {
            const status = await navigator.permissions.query({ name: "periodic-background-sync" as any })
            if (status.state === "granted") {
              await (reg as any).periodicSync.register("balance-update", {
                minInterval: 24 * 60 * 60 * 1000, // 24 hours
              })
            }
          }
        } catch (error) {
          console.error("Service Worker registration failed:", error)
        }
      }
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("Install prompt triggered")
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log("App was installed successfully")
      setIsInstallable(false)
      setInstallPrompt(null)
      setIsStandalone(true)

      // Send analytics event
      gtag("event", "app_installed", {
        event_category: "PWA",
        event_label: "VillonairesWorld",
      })
    }

    checkStandalone()
    checkNotificationSupport()
    registerSW()

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // Handle online/offline status
    const handleOnline = () => console.log("App is online")
    const handleOffline = () => console.log("App is offline")

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) {
      console.log("No install prompt available")
      throw new Error("Installation not available")
    }

    try {
      console.log("Showing install prompt...")

      // Show the install prompt
      const result = await installPrompt.prompt()
      console.log("Install prompt result:", result)

      // Wait for the user to respond to the prompt
      const userChoice = await installPrompt.userChoice
      console.log("User choice:", userChoice.outcome)

      if (userChoice.outcome === "accepted") {
        console.log("User accepted the install prompt")
        setIsInstallable(false)
        setInstallPrompt(null)

        // The app will be installed, standalone mode will be detected on next launch
      } else {
        console.log("User dismissed the install prompt")
      }
    } catch (error) {
      console.error("Installation failed:", error)
      throw error
    }
  }

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!isNotificationSupported) return false

    try {
      const permission = await Notification.requestPermission()
      const granted = permission === "granted"
      setIsNotificationPermitted(granted)

      if (granted && registration) {
        // Subscribe to push notifications
        try {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          })
          console.log("Push subscription:", subscription)
        } catch (error) {
          console.error("Push subscription failed:", error)
        }
      }

      return granted
    } catch (error) {
      console.error("Notification permission request failed:", error)
      return false
    }
  }

  const sendNotification = (title: string, body: string, options?: NotificationOptions) => {
    if (!isNotificationPermitted) return

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      // Send via service worker for better reliability
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_NOTIFICATION",
        payload: { title, body, ...options },
      })
    } else {
      // Fallback to direct notification
      new Notification(title, {
        body,
        icon: "/images/villonaires-logo.png",
        badge: "/images/villonaires-logo.png",
        ...options,
      })
    }
  }

  const updateApp = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" })
    }
  }

  return (
    <PWAContext.Provider
      value={{
        isStandalone,
        isInstallable,
        installPrompt,
        installApp,
        isNotificationSupported,
        isNotificationPermitted,
        requestNotificationPermission,
        sendNotification,
        updateAvailable,
        updateApp,
      }}
    >
      {children}
    </PWAContext.Provider>
  )
}

export function usePWA() {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error("usePWA must be used within a PWAProvider")
  }
  return context
}
