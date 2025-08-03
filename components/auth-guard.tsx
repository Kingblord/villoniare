"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface AuthGuardProps {
  children: React.ReactNode
  requirePin?: boolean
}

export function AuthGuard({ children, requirePin = false }: AuthGuardProps) {
  const { user, loading, pinVerified } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/access")
      return
    }

    if (requirePin && !pinVerified) {
      router.push("/pin")
      return
    }
  }, [user, loading, pinVerified, requirePin, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requirePin && !pinVerified) {
    return null
  }

  return <>{children}</>
}
