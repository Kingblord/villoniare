"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Copy, Plus, Trash2, MessageCircle, Check, Eye, EyeOff } from "lucide-react"
import { useWallet } from "@/lib/use-wallet"
import { useAuth } from "@/lib/auth-context"

interface ProfileModalProps {
  onClose: () => void
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const { walletAddress, privateKey, generateNewWallet, deleteWallet } = useWallet()
  const { user, signOut } = useAuth()

  const handleCopyPrivateKey = async () => {
    if (privateKey) {
      await navigator.clipboard.writeText(privateKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const formatPrivateKey = (key: string) => {
    if (!showPrivateKey) {
      return "•".repeat(32)
    }
    return key
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-sm bg-slate-800 border-slate-700 max-h-[80vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">Profile</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 overflow-y-auto max-h-[60vh] px-4">
          {/* User Info */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Email</div>
            <div className="text-white text-sm">{user?.email}</div>
          </div>

          {/* Wallet Address */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Wallet Address</div>
            <div className="text-white font-mono text-xs break-all">{walletAddress || "Loading..."}</div>
          </div>

          {/* Private Key */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400">Private Key</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="text-slate-400 hover:text-white p-1 h-6 w-6"
              >
                {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
            <div className="text-white font-mono text-xs break-all mb-2">{formatPrivateKey(privateKey || "")}</div>
            <Button
              onClick={handleCopyPrivateKey}
              disabled={!privateKey}
              size="sm"
              className="w-full bg-slate-600 hover:bg-slate-500 text-white rounded-lg h-8 text-xs"
            >
              {copiedKey ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Private Key
                </>
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={generateNewWallet}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl h-10 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Wallet
            </Button>

            <Button onClick={deleteWallet} variant="destructive" className="w-full rounded-xl h-10 text-sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Wallet
            </Button>

            <Button
              onClick={() => window.open("https://t.me/villonairesworld", "_blank")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-sm"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Telegram Support
            </Button>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl bg-transparent h-10 text-sm"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
