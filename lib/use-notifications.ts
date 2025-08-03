"use client"

import { useEffect } from "react"
import { usePWA } from "@/lib/pwa-context"

export function useNotifications() {
  const { isNotificationSupported, isNotificationPermitted, requestNotificationPermission, sendNotification } = usePWA()

  useEffect(() => {
    // Request notification permission on first load
    if (isNotificationSupported && !isNotificationPermitted) {
      // Don't request immediately, wait for user interaction
      const timer = setTimeout(() => {
        requestNotificationPermission()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [isNotificationSupported, isNotificationPermitted, requestNotificationPermission])

  const notifyTransactionComplete = (type: string, amount: number, token: string) => {
    sendNotification("Transaction Complete! ✅", `${type} of ${amount} ${token} completed successfully`, {
      icon: "/images/villonaires-logo.png",
      badge: "/images/villonaires-logo.png",
      tag: "transaction-complete",
      requireInteraction: true,
      actions: [
        {
          action: "view",
          title: "View Wallet",
        },
      ],
    })
  }

  const notifyTransactionFailed = (type: string, error: string) => {
    sendNotification("Transaction Failed ❌", `${type} failed: ${error}`, {
      icon: "/images/villonaires-logo.png",
      badge: "/images/villonaires-logo.png",
      tag: "transaction-failed",
      requireInteraction: true,
    })
  }

  const notifyOrderUpdate = (status: string, tokenName: string) => {
    const emoji = status === "approved" ? "✅" : status === "rejected" ? "❌" : "⏳"
    sendNotification(
      `Order ${status.charAt(0).toUpperCase() + status.slice(1)} ${emoji}`,
      `Your ${tokenName} order has been ${status}`,
      {
        icon: "/images/villonaires-logo.png",
        badge: "/images/villonaires-logo.png",
        tag: "order-update",
        requireInteraction: true,
        actions: [
          {
            action: "view",
            title: "View Details",
          },
        ],
      },
    )
  }

  const notifyTokenReceived = (amount: number, token: string) => {
    sendNotification("Tokens Received! 🎉", `You received ${amount} ${token} in your wallet`, {
      icon: "/images/villonaires-logo.png",
      badge: "/images/villonaires-logo.png",
      tag: "tokens-received",
      requireInteraction: true,
      actions: [
        {
          action: "view",
          title: "View Wallet",
        },
      ],
    })
  }

  return {
    isNotificationSupported,
    isNotificationPermitted,
    requestNotificationPermission,
    notifyTransactionComplete,
    notifyTransactionFailed,
    notifyOrderUpdate,
    notifyTokenReceived,
  }
}
