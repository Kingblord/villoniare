"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAdminAccess = () => {
      if (loading) return

      // Check if user is logged in
      if (!user) {
        router.push("/admin-access")
        return
      }

      // Check if user email starts with admin@
      const userEmail = user.email?.toLowerCase()
      if (!userEmail || !userEmail.startsWith("admin@")) {
        router.push("/admin-access")
        return
      }

      // Check if admin session is valid
      const adminAccess = sessionStorage.getItem("adminAccess")
      if (adminAccess !== "true") {
        router.push("/admin-access")
        return
      }

      setIsAdmin(true)
      setChecking(false)
    }

    checkAdminAccess()
  }, [user, loading, router])

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Verifying admin access...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}
