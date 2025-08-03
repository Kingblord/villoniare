"use client"

import { useState } from "react"
import { Coins, Zap, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { ProfileModal } from "@/components/profile-modal"
import { AuthGuard } from "@/components/auth-guard"
import { useTokens } from "@/lib/use-tokens"
import { useAuth } from "@/lib/auth-context"
import { FlashOrderModal } from "@/components/flash-order-modal"
import { formatCurrency } from "@/lib/utils"

export default function FlashStorePage() {
  const [selectedToken, setSelectedToken] = useState<any>(null)
  const [showProfile, setShowProfile] = useState(false)
  const { tokens, loading } = useTokens()
  const { user } = useAuth()

  return (
    <AuthGuard requirePin={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pb-20">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Flash Store</h1>
              <p className="text-slate-400">Generate flash tokens with manual processing</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="text-slate-400 hover:text-white"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>

          {/* Token Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="bg-slate-800/50 border-slate-700 animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-slate-700 rounded mb-2"></div>
                      <div className="h-3 bg-slate-700 rounded w-2/3 mb-4"></div>
                      <div className="h-8 bg-slate-700 rounded"></div>
                    </CardContent>
                  </Card>
                ))
              : tokens.map((token) => (
                  <Card
                    key={token.id}
                    className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                    onClick={() => setSelectedToken(token)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {token.logoUrl ? (
                            <img
                              src={token.logoUrl || "/placeholder.svg"}
                              alt={token.name}
                              className="w-10 h-10 rounded-full"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                                target.nextElementSibling?.classList.remove("hidden")
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center ${token.logoUrl ? "hidden" : ""}`}
                          >
                            <Coins className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-white">{token.name}</CardTitle>
                            <CardDescription className="text-slate-400">{token.symbol}</CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-400 font-semibold">{formatCurrency(token.price)}</div>
                          <div className="text-xs text-slate-400">per token</div>
                          <div className="text-xs text-slate-500">+ $1 fee</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">{token.description}</p>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedToken(token)
                        }}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Generate {token.symbol}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
          </div>

          {tokens.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coins className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Flash Tokens Available</h3>
              <p className="text-slate-400">Check back later for available flash tokens to generate.</p>
            </div>
          )}
        </div>

        <BottomNav currentPage="flash-store" />

        {selectedToken && <FlashOrderModal token={selectedToken} onClose={() => setSelectedToken(null)} />}
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      </div>
    </AuthGuard>
  )
}
