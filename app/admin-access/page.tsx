"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Shield } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { ErrorAlert } from "@/components/error-alert"

export default function AdminAccessPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { signIn, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user is already logged in, check if they're admin
    if (user) {
      checkAdminAccess(user.email)
    }
  }, [user])

  const checkAdminAccess = (userEmail: string | null) => {
    if (userEmail && userEmail.toLowerCase().startsWith("admin@")) {
      // Set admin session flag
      sessionStorage.setItem("adminAccess", "true")
      router.push("/admin")
    } else {
      setError("Access denied. Admin email required.")
      // Clear any existing admin session
      sessionStorage.removeItem("adminAccess")
    }
  }

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "No admin account found with this email."
      case "auth/wrong-password":
        return "Incorrect password. Please try again."
      case "auth/invalid-email":
        return "Please enter a valid email address."
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later."
      case "auth/network-request-failed":
        return "Network error. Please check your connection."
      default:
        return "Authentication failed. Please try again."
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // Check if email starts with admin@
    if (!email.toLowerCase().startsWith("admin@")) {
      setError("Access denied. Only admin accounts are allowed.")
      setLoading(false)
      return
    }

    try {
      await signIn(email, password)
      setSuccess("Admin authentication successful! Redirecting...")

      // Set admin session flag
      sessionStorage.setItem("adminAccess", "true")

      // Redirect will happen via useEffect when user state updates
    } catch (error: any) {
      console.error("Admin auth error:", error)
      setError(getErrorMessage(error.code))
      // Clear admin session on failed login
      sessionStorage.removeItem("adminAccess")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Admin Access</CardTitle>
            <CardDescription className="text-slate-400">Restricted access for administrators only</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <ErrorAlert message={error} type="error" onClose={() => setError("")} />}
            {success && <ErrorAlert message={success} type="success" onClose={() => setSuccess("")} />}

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
              <p className="text-amber-400 text-sm">
                <strong>Admin Only:</strong> This area is restricted to administrators. Your email must start with
                "admin@" to access the admin panel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Admin Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@yourdomain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500"
                    required
                  />
                </div>
                {email && !email.toLowerCase().startsWith("admin@") && (
                  <p className="text-red-400 text-xs">Email must start with "admin@"</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 text-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-3 rounded-xl transition-all duration-200"
                disabled={loading || !email.toLowerCase().startsWith("admin@")}
              >
                {loading ? "Authenticating..." : "Access Admin Panel"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">Need admin access? Contact your system administrator.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
