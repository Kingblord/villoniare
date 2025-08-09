"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Package, ShoppingCart, Check, LogOut, Shield, Copy, Loader2, Eraser } from "lucide-react"
import { AdminGuard } from "@/components/admin-guard"
import { useAdmin } from "@/lib/use-admin"
import { useAuth } from "@/lib/auth-context"
import { ErrorAlert } from "@/components/error-alert"
import { formatCurrency, formatTokenAmount, truncateAddress } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { isValidBSCAddress, getTokenInfo } from "@/lib/web3" // Import getTokenInfo
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { clearAllTransactions } from "@/app/actions/admin-actions" // Import the new server action

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("tokens")
  const [showAddToken, setShowAddToken] = useState(false)
  const [editingToken, setEditingToken] = useState<any>(null)
  const [tokenForm, setTokenForm] = useState({
    name: "",
    symbol: "",
    description: "",
    price: "",
    logoUrl: "",
    type: "manual", // New: default to manual
    contractAddress: "", // New
    decimals: "", // Add decimals to state
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isFetchingTokenInfo, setIsFetchingTokenInfo] = useState(false) // New state for fetching token info
  const [clearingTransactions, setClearingTransactions] = useState(false) // New state for clearing transactions

  const { tokens, orders, loading, addToken, updateToken, deleteToken, markOrderCompleted } = useAdmin()
  const { user, signOut } = useAuth()
  const router = useRouter()

  // Effect to fetch token info when contract address changes for auto tokens
  useEffect(() => {
    const fetchAndSetTokenInfo = async () => {
      if (tokenForm.type === "auto" && isValidBSCAddress(tokenForm.contractAddress)) {
        setIsFetchingTokenInfo(true)
        setError("")
        try {
          const info = await getTokenInfo(tokenForm.contractAddress)
          if (info) {
            setTokenForm((prev) => ({
              ...prev,
              name: info.name,
              symbol: info.symbol,
              decimals: info.decimals.toString(),
              // Price is for display only for auto tokens, can be left empty or set to 0
              // If editing an existing token, keep its price, otherwise set to 0
              price: editingToken ? prev.price : "0",
            }))
            setSuccess("Token info fetched successfully!")
          } else {
            setError("Could not fetch token info. Please check the contract address.")
          }
        } catch (err: any) {
          console.error("Error fetching token info:", err)
          setError("Failed to fetch token info: " + err.message)
        } finally {
          setIsFetchingTokenInfo(false)
        }
      } else if (tokenForm.type === "manual") {
        // Clear contract address and decimals if switching to manual
        setTokenForm((prev) => ({
          ...prev,
          contractAddress: "",
          decimals: "",
        }))
      }
    }

    fetchAndSetTokenInfo()
  }, [tokenForm.contractAddress, tokenForm.type, editingToken]) // Add editingToken to dependency array

  const handleAdminSignOut = async () => {
    // Clear admin session
    sessionStorage.removeItem("adminAccess")
    await signOut()
    router.push("/admin-access")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    try {
      const tokenData = {
        ...tokenForm,
        price: Number.parseFloat(tokenForm.price),
        decimals: tokenForm.type === "auto" ? Number.parseInt(tokenForm.decimals) : undefined, // Parse decimals if auto
      }

      if (editingToken) {
        await updateToken(editingToken.id, tokenData)
        setSuccess("Flash token updated successfully!")
        setEditingToken(null)
      } else {
        await addToken(tokenData)
        setSuccess("Flash token added successfully!")
        setShowAddToken(false)
      }
      setTokenForm({
        name: "",
        symbol: "",
        description: "",
        price: "",
        logoUrl: "",
        type: "manual", // Reset to default
        contractAddress: "", // Reset
        decimals: "", // Reset
      })
    } catch (error: any) {
      setError(error.message || "Failed to save flash token")
    }
  }

  const handleEdit = (token: any) => {
    setEditingToken(token)
    setTokenForm({
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      price: token.price,
      logoUrl: token.logoUrl || "",
      type: token.type || "manual", // Set type from existing token
      contractAddress: token.contractAddress || "", // Set contractAddress
      decimals: token.decimals?.toString() || "", // Set decimals from existing token
    })
    setShowAddToken(true)
  }

  const handleDelete = async (tokenId: string) => {
    if (confirm("Are you sure you want to delete this flash token?")) {
      try {
        await deleteToken(tokenId)
        setSuccess("Flash token deleted successfully!")
      } catch (error: any) {
        setError(error.message || "Failed to delete flash token")
      }
    }
  }

  const handleMarkCompleted = async (orderId: string) => {
    if (confirm("Mark this order as completed? This will notify the user that tokens have been sent.")) {
      try {
        await markOrderCompleted(orderId)
        setSuccess("Order marked as completed!")
      } catch (error: any) {
        setError(error.message || "Failed to mark order as completed")
      }
    }
  }

  const handleClearAllTransactions = async () => {
    if (
      confirm(
        "Are you absolutely sure you want to clear ALL transaction history for ALL users? This action is irreversible.",
      )
    ) {
      setClearingTransactions(true)
      setError("")
      setSuccess("")
      try {
        const result = await clearAllTransactions()
        if (result.success) {
          setSuccess(result.message)
        } else {
          setError(result.error || result.message)
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while clearing transactions.")
      } finally {
        setClearingTransactions(false)
      }
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
        <div className="container mx-auto max-w-6xl">
          {/* Admin Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Flash Admin Panel</h1>
                <p className="text-slate-400">
                  Logged in as: <span className="text-amber-400">{user?.email}</span>
                </p>
              </div>
            </div>
            <Button
              onClick={handleAdminSignOut}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {error && <ErrorAlert message={error} type="error" onClose={() => setError("")} />}
          {success && <ErrorAlert message={success} type="success" onClose={() => setSuccess("")} />}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="tokens" className="data-[state=active]:bg-amber-500">
                <Package className="w-4 h-4 mr-2" />
                Flash Tokens
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-amber-500">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Flash Orders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tokens" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Flash Token Management</h2>
                <Button
                  onClick={() => {
                    setShowAddToken(true)
                    setEditingToken(null)
                    setTokenForm({
                      name: "",
                      symbol: "",
                      description: "",
                      price: "",
                      logoUrl: "",
                      type: "manual",
                      contractAddress: "",
                      decimals: "",
                    })
                    setError("")
                    setSuccess("")
                  }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Flash Token
                </Button>
              </div>

              {showAddToken && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {editingToken ? "Edit Flash Token" : "Add New Flash Token"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label className="text-slate-300">Token Type</Label>
                        <Select
                          value={tokenForm.type}
                          onValueChange={(value: "manual" | "auto") =>
                            setTokenForm({ ...tokenForm, type: value, contractAddress: "", decimals: "" })
                          }
                        >
                          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                            <SelectValue placeholder="Select token type" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="manual" className="text-white">
                              Manual Processing
                            </SelectItem>
                            <SelectItem value="auto" className="text-white">
                              Automatic Generation (Instant)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-400 mt-1">
                          Manual tokens are processed by admin. Automatic tokens are generated instantly via smart
                          contract.
                        </p>
                      </div>

                      {tokenForm.type === "auto" && (
                        <>
                          <div>
                            <Label className="text-slate-300">Token Contract Address (BSC)</Label>
                            <div className="relative">
                              <Input
                                value={tokenForm.contractAddress}
                                onChange={(e) => setTokenForm({ ...tokenForm, contractAddress: e.target.value })}
                                placeholder="0x..."
                                className="bg-slate-700/50 border-slate-600 text-white pr-10"
                                required={tokenForm.type === "auto"}
                              />
                              {isFetchingTokenInfo && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                              )}
                            </div>
                            {!isValidBSCAddress(tokenForm.contractAddress) && tokenForm.contractAddress.length > 0 && (
                              <p className="text-red-400 text-xs mt-1">Invalid BSC address</p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              The contract address of the token on Binance Smart Chain (BSC).
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-slate-300">Token Name</Label>
                              <Input
                                value={tokenForm.name}
                                onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
                                placeholder="e.g., Flash Bitcoin"
                                className="bg-slate-700/50 border-slate-600 text-white"
                                required
                                readOnly={tokenForm.type === "auto" && !isFetchingTokenInfo && tokenForm.name !== ""}
                              />
                            </div>
                            <div>
                              <Label className="text-slate-300">Symbol</Label>
                              <Input
                                value={tokenForm.symbol}
                                onChange={(e) => setTokenForm({ ...tokenForm, symbol: e.target.value })}
                                placeholder="e.g., FBTC"
                                className="bg-slate-700/50 border-slate-600 text-white"
                                required
                                readOnly={tokenForm.type === "auto" && !isFetchingTokenInfo && tokenForm.symbol !== ""}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-slate-300">Token Decimals</Label>
                            <Input
                              type="number"
                              value={tokenForm.decimals}
                              onChange={(e) => setTokenForm({ ...tokenForm, decimals: e.target.value })}
                              placeholder="e.g., 18"
                              className="bg-slate-700/50 border-slate-600 text-white"
                              required={tokenForm.type === "auto"}
                              readOnly={tokenForm.type === "auto" && !isFetchingTokenInfo && tokenForm.decimals !== ""}
                            />
                            <p className="text-xs text-slate-400 mt-1">
                              The number of decimal places for this token (e.g., 18 for most ERC-20 tokens).
                            </p>
                          </div>
                        </>
                      )}

                      {tokenForm.type === "manual" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-slate-300">Token Name</Label>
                            <Input
                              value={tokenForm.name}
                              onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
                              placeholder="e.g., Flash Bitcoin"
                              className="bg-slate-700/50 border-slate-600 text-white"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-slate-300">Symbol</Label>
                            <Input
                              value={tokenForm.symbol}
                              onChange={(e) => setTokenForm({ ...tokenForm, symbol: e.target.value })}
                              placeholder="e.g., FBTC"
                              className="bg-slate-700/50 border-slate-600 text-white"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-slate-300">Price per Token (USD)</Label>
                        <Input
                          type="number"
                          step="any"
                          value={tokenForm.price}
                          onChange={(e) => setTokenForm({ ...tokenForm, price: e.target.value })}
                          placeholder="e.g., 0.0001"
                          className="bg-slate-700/50 border-slate-600 text-white"
                          required
                          disabled={tokenForm.type === "auto"} // Disable for auto tokens
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Set the USD price per token (e.g., 0.0001 means 1 token costs $0.0001). A $1 network fee will
                          be added automatically.
                          {tokenForm.type === "auto" && (
                            <>
                              <br />
                              <span className="text-amber-400">
                                Note: For automatic tokens, this price is for display and calculation purposes only. The
                                actual BNB cost is determined by the live exchange rate on PancakeSwap.
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <div>
                        <Label className="text-slate-300">Logo URL (Optional)</Label>
                        <Input
                          value={tokenForm.logoUrl}
                          onChange={(e) => setTokenForm({ ...tokenForm, logoUrl: e.target.value })}
                          placeholder="https://..."
                          className="bg-slate-700/50 border-slate-600 text-white"
                        />
                      </div>

                      <div>
                        <Label className="text-slate-300">Description</Label>
                        <Textarea
                          value={tokenForm.description}
                          onChange={(e) => setTokenForm({ ...tokenForm, description: e.target.value })}
                          placeholder="Token description..."
                          className="bg-slate-700/50 border-slate-600 text-white"
                          required
                        />
                      </div>

                      <div className="flex space-x-3">
                        <Button
                          type="submit"
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                          disabled={isFetchingTokenInfo} // Disable submit while fetching info
                        >
                          {isFetchingTokenInfo ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching Info...
                            </>
                          ) : editingToken ? (
                            "Update Token"
                          ) : (
                            "Add Token"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowAddToken(false)
                            setEditingToken(null)
                            setTokenForm({
                              name: "",
                              symbol: "",
                              description: "",
                              price: "",
                              logoUrl: "",
                              type: "manual",
                              contractAddress: "",
                              decimals: "",
                            })
                            setError("")
                            setSuccess("")
                          }}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Token List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="bg-slate-800/50 border-slate-700 animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-slate-700 rounded mb-2"></div>
                        <div className="h-3 bg-slate-700 rounded w-2/3 mb-4"></div>
                        <div className="h-8 bg-slate-700 rounded"></div>
                      </CardContent>
                    </Card>
                  ))
                ) : tokens.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-slate-400">No flash tokens added yet</p>
                  </div>
                ) : (
                  tokens.map((token) => (
                    <Card key={token.id} className="bg-slate-800/50 border-slate-700">
                      <CardHeader className="pb-3">
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
                              <CardTitle className="text-lg text-white">{token.name}</CardTitle>
                              <p className="text-slate-400 text-sm">{token.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-amber-400 font-semibold">{formatCurrency(token.price)}</div>
                            <div className="text-xs text-slate-400">per token</div>
                            <div className="text-xs text-xs text-slate-500">+ $1 fee</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-slate-400 text-sm mb-4">{token.description}</p>
                        <div className="flex space-x-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleEdit(token)}
                            className="bg-slate-700 hover:bg-slate-600"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(token.id)}>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>

                          {token.type === "auto" && token.contractAddress && null}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Flash Orders</h2>
                <Button
                  onClick={handleClearAllTransactions}
                  disabled={clearingTransactions}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {clearingTransactions ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Clearing...
                    </>
                  ) : (
                    <>
                      <Eraser className="w-4 h-4 mr-2" />
                      Clear All Transactions
                    </>
                  )}
                </Button>
              </div>

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
                      <p className="text-slate-400">No flash orders yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  orders.map((order) => (
                    <Card key={order.id} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-white">{order.tokenName}</h3>
                              <Badge
                                variant={order.status === "pending" ? "secondary" : "default"}
                                className={
                                  order.status === "pending"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : "bg-green-500/20 text-green-400"
                                }
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-400 space-y-1">
                              <p>User: {order.userEmail}</p>
                              <p>
                                Amount:{" "}
                                {order.type === "manual"
                                  ? `${formatCurrency(order.usdAmountToSpend)} for ${order.tokenName}`
                                  : `${formatTokenAmount(order.tokenAmount)} ${order.tokenSymbol}`}
                              </p>
                              <p>Recipient: {truncateAddress(order.recipientAddress)}</p>
                              <p>
                                Payment: {formatCurrency(order.totalUsdAmount || order.tokenCostUsd)} (
                                {formatTokenAmount(order.totalBnbAmount || order.bnbAmount)} BNB)
                                {order.networkFeeUsd && (
                                  <span className="text-xs text-slate-500"> - incl. ${order.networkFeeUsd} fee</span>
                                )}
                              </p>
                              <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {order.status === "pending" && (
                            <div className="flex flex-col space-y-2">
                              <Button
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(order.recipientAddress)}
                                className="bg-slate-700 hover:bg-slate-600"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy Address
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleMarkCompleted(order.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Mark Flashed
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Note: For manual orders, the "Amount" displays the USD value the user intended to spend, as the exact
                token quantity is determined during manual processing. For automatic orders, it displays the estimated
                tokens received.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminGuard>
  )
}
