"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, CheckCircle, Copy, ExternalLink } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { formatCurrency, formatTokenAmount, truncateAddress } from "@/lib/utils"

interface Order {
  id: string
  tokenName: string
  tokenSymbol: string
  tokenAmount: number
  recipientAddress: string
  tokenCostUsd: number
  networkFeeUsd: number
  totalUsdAmount: number
  totalBnbAmount: number
  paymentHash: string
  status: "pending" | "completed"
  createdAt: Date
  completedAt?: Date
  type: "manual" | "auto" // New field
}

export default function OrderHistoryPage() {
  const { user, loading: authLoading } = useAuth() // Get authLoading state
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only proceed if authentication is not loading and a user is logged in with a UID
    if (authLoading || !user?.uid) {
      setLoading(false) // Stop loading if no user or still authenticating
      setOrders([]) // Clear orders if no user
      return
    }

    setLoading(true) // Start loading when user is available and query is about to run

    const ordersRef = collection(db, "orders")
    const q = query(ordersRef, where("userId", "==", user.uid))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          completedAt: doc.data().completedAt?.toDate?.() || null,
          type: doc.data().type || "manual", // Default to manual if not set
        })) as Order[]

        // Sort by createdAt in JavaScript instead of Firestore
        ordersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        setOrders(ordersData)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching orders:", error)
        setLoading(false)
        setOrders([]) // Clear orders on error
      },
    )

    return () => {
      unsubscribe() // Clean up the listener when component unmounts or dependencies change
    }
  }, [user?.uid, authLoading]) // Depend on user.uid and authLoading

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  const openTransaction = (hash: string) => {
    if (hash) {
      window.open(`https://bscscan.com/tx/${hash}`, "_blank")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "pending":
        return <Clock className="w-4 h-4 text-orange-400" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400">Completed</Badge>
      case "pending":
        return <Badge className="bg-orange-500/20 text-orange-400">Processing</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">Unknown</Badge>
    }
  }

  return (
    <AuthGuard requirePin={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Link href="/flash-wallet">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Wallet
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Order History</h1>
            <p className="text-slate-400">Track your flash token orders and their status</p>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700 animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-slate-700 rounded mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))
            ) : orders.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Orders Yet</h3>
                  <p className="text-slate-400 mb-4">You haven't placed any flash token orders yet.</p>
                  <Link href="/flash-store">
                    <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                      Browse Flash Store
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <CardTitle className="text-lg text-white">{order.tokenName}</CardTitle>
                          <p className="text-slate-400 text-sm">
                            {formatTokenAmount(order.tokenAmount)} {order.tokenSymbol}
                            {order.type === "auto" ? " (Instant)" : " (Manual)"}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Recipient:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-mono">{truncateAddress(order.recipientAddress)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyAddress(order.recipientAddress)}
                            className="text-slate-400 hover:text-white p-1 h-auto"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Cost:</span>
                        <div className="text-white">
                          {formatCurrency(order.totalUsdAmount || order.tokenCostUsd)} (
                          {formatTokenAmount(order.totalBnbAmount || order.bnbAmount)} BNB)
                          {order.networkFeeUsd && (
                            <div className="text-xs text-slate-500">
                              Token: {formatCurrency(order.tokenCostUsd)} + Fee: ${order.networkFeeUsd}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Order Date:</span>
                        <div className="text-white">{order.createdAt.toLocaleDateString()}</div>
                      </div>
                      {order.completedAt && (
                        <div>
                          <span className="text-slate-400">Completed:</span>
                          <div className="text-white">{order.completedAt.toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>

                    {order.status === "pending" && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <p className="text-orange-400 text-sm">
                          <strong>Processing:</strong> Your order is being processed manually. You'll receive a
                          notification when your tokens are sent to the recipient address.
                        </p>
                      </div>
                    )}

                    {order.status === "completed" && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <p className="text-green-400 text-sm">
                          <strong>Completed:</strong> Your tokens have been successfully sent to the recipient address.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                      <span className="text-slate-400 text-sm">Payment Transaction:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTransaction(order.paymentHash)}
                        className="text-slate-400 hover:text-white"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View on BSCScan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
