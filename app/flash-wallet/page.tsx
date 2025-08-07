"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Wallet,
  Clock,
  ExternalLink,
  RefreshCw,
  Copy,
  Zap,
  Plus,
} from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { SendModal } from "@/components/send-modal"
import { ReceiveModal } from "@/components/receive-modal"
import { ProfileModal } from "@/components/profile-modal"
import { AuthGuard } from "@/components/auth-guard"
import { useWallet } from "@/lib/use-wallet"
import { formatCurrency, formatTokenAmount, truncateAddress } from "@/lib/utils"
import Link from "next/link"
import { ImportTokenModal } from "@/components/import-token-modal"
import { useAuth } from "@/lib/auth-context"

// Local helper ─ determines the text color for a transaction amount
function getTransactionColor(type: string, status: string) {
  if (status === "failed") return "text-red-400"
  if (status === "pending") return "text-orange-400"

  switch (type) {
    case "send":
      return "text-red-400"
    case "receive":
      return "text-green-400"
    case "generate":
      return "text-amber-400"
    case "vendor_payment":
      return "text-orange-400"
    default:
      return "text-slate-400"
  }
}

export default function FlashWalletPage() {
  const [showSend, setShowSend] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuth()
  const { balance, tokens, transactions, walletAddress, privateKey, loading, refreshBalance, refreshTokens } =
    useWallet()
  const [showImportTokenModal, setShowImportTokenModal] = useState(false)
  const hasNativeBNB = balance.bnb > 0.001
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshBalance()
      await refreshTokens()
    } catch (error) {
      console.error("Error refreshing balance:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "send":
        return <ArrowUpRight className="w-4 h-4 text-red-400" />
      case "receive":
        return <ArrowDownLeft className="w-4 h-4 text-green-400" />
      case "generate":
        return <Zap className="w-4 h-4 text-amber-400" />
      case "vendor_payment":
        return <Clock className="w-4 h-4 text-orange-400" />
      default:
        return <Wallet className="w-4 h-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-400 text-xs">Success</Badge>
      case "pending":
        return <Badge className="bg-orange-500/20 text-orange-400 text-xs">Pending</Badge>
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 text-xs">Failed</Badge>
      default:
        return null
    }
  }

  const openTransaction = (hash: string) => {
    if (hash && hash !== "") {
      window.open(`https://bscscan.com/tx/${hash}`, "_blank")
    }
  }

  if (loading) {
    return (
      <AuthGuard requirePin={true}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-white">Loading wallet...</div>
        </div>
      </AuthGuard>
    )
  }

 const tokensToDisplay = tokens.filter(
  (token) => token.balance > 0 || token.isImported || token.type === "manual"
)

  return (
    <AuthGuard requirePin={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pb-20">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Flash Wallet</h1>
              <div className="flex items-center space-x-2">
                <p className="text-slate-400">{truncateAddress(walletAddress)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="text-slate-400 hover:text-white p-1 h-auto"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfile(true)}
                className="text-slate-400 hover:text-white"
              >
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Balance Card */}
          <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{formatCurrency(balance.totalUsd)}</div>
              <div className="text-slate-300 space-y-1">
               {hasNativeBNB ? (
  <div>{formatTokenAmount(balance.bnb)} BNB</div>
) : (
  <div>0 BNB</div>
)}
              </div>
              {balance.bnbPrice > 0 && (
                <div className="text-sm text-slate-400">BNB Price: {formatCurrency(balance.bnbPrice)}</div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button
              onClick={() => setShowSend(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 py-6 rounded-xl"
            >
              <ArrowUpRight className="w-5 h-5 mr-2" />
              Send
            </Button>
            <Button
              onClick={() => setShowReceive(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 py-6 rounded-xl"
            >
              <ArrowDownLeft className="w-5 h-5 mr-2" />
              Receive
            </Button>
          </div>

          {/* Token List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Your Tokens</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImportTokenModal(true)}
                className="text-slate-400 hover:text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Import Token
              </Button>
            </div>

            {tokensToDisplay.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center">
                  <div className="text-slate-400 mb-2">No tokens yet</div>
                  <div className="text-sm text-slate-500">
                    Visit the Flash Store to generate your first tokens or import one.
                  </div>
                </CardContent>
              </Card>
            ) : (
              tokensToDisplay.map((token) => (
                <Card key={token.id} className="bg-slate-800/50 border-slate-700 mb-3">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {token.logoUrl ? (
                          <img
                            src={token.logoUrl || "/placeholder.svg"}
                            alt={token.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{token.symbol}</span>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white">{token.name}</div>
                          <div className="text-sm text-slate-400">{token.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">
                          {formatTokenAmount(token.balance)} {token.symbol}
                        </div>
                        {token.price > 0 && (
                          <div className="text-sm text-slate-400">{formatCurrency(token.balance * token.price)}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Transaction History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
              <Link href="/order-history">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  View Order History
                </Button>
              </Link>
            </div>

            {transactions.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center">
                  <div className="text-slate-400 mb-2">No transactions yet</div>
                  <div className="text-sm text-slate-500">Your transaction history will appear here</div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 10).map((tx) => (
                  <Card key={tx.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getTransactionIcon(tx.type)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-white capitalize">
                                {tx.type === "generate"
                                  ? "Flash Generated"
                                  : tx.type === "vendor_payment"
                                    ? "Vendor Order"
                                    : tx.type}
                              </span>
                              {getStatusBadge(tx.status)}
                            </div>
                            <div className="text-sm text-slate-400">
                              {tx.recipient && <span>To: {truncateAddress(tx.recipient)} • </span>}
                              {tx.to && <span>To: {truncateAddress(tx.to)} • </span>}
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${getTransactionColor(tx.type, tx.status)}`}>
                            {tx.type === "send" ? "-" : tx.type === "receive" ? "+" : ""}
                            {formatTokenAmount(tx.amount)} {tx.token}
                          </div>
                          {tx.hash && tx.hash !== "" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTransaction(tx.hash)}
                              className="text-slate-400 hover:text-white p-0 h-auto text-xs"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <BottomNav currentPage="flash-wallet" />

        {showSend && <SendModal onClose={() => setShowSend(false)} />}
        {showReceive && <ReceiveModal onClose={() => setShowReceive(false)} />}
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        {showImportTokenModal && <ImportTokenModal onClose={() => setShowImportTokenModal(false)} />}
      </div>
    </AuthGuard>
  )
}
