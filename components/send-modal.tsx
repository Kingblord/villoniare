"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Send, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useWallet } from "@/lib/use-wallet"
import { useAuth } from "@/lib/auth-context"
import {
  executeBNBTransfer,
  executeTokenTransfer,
  TREASURY_ADDRESS, // Keep this import
  DEV_WALLET_ADDRESS, // New: Import DEV_WALLET_ADDRESS
  isValidBSCAddress,
  TREASURY_WALLET_LAST_DIGITS, // Keep for suffix check
  DEV_WALLET_LAST_DIGITS, // Keep for suffix check
  verifyAddressSuffix, // Keep for suffix check
  isZeroAddress, // New: Import isZeroAddress
} from "@/lib/web3"
import { formatTokenAmount, formatCurrency } from "@/lib/utils"
import { getCachedBNBPrice } from "@/lib/price-fetcher" // Import getCachedBNBPrice

interface SendModalProps {
  onClose: () => void
}

// Client-side constants for the USD flat fees for sending tokens
const CLIENT_TREASURY_SEND_TOKEN_FLAT_FEE_USD = Number.parseFloat(
  process.env.NEXT_PUBLIC_SEND_TOKEN_FLAT_FEE_USD || "0.10",
)
const CLIENT_DEV_SEND_TOKEN_FLAT_FEE_USD = Number.parseFloat(process.env.NEXT_PUBLIC_SEND_TOKEN_DEV_FEE_USD || "0.00") // New dev fee

export function SendModal({ onClose }: SendModalProps) {
  const { user } = useAuth()
  const { balance, tokens, addTransaction, refreshBalance, refreshTokens, tokensLoading } = useWallet() // Get tokensLoading
  const [selectedToken, setSelectedToken] = useState("BNB")
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isValidAddress, setIsValidAddress] = useState(false)
  const [currentBnbPrice, setCurrentBnbPrice] = useState(0)

  useEffect(() => {
    const fetchPrice = async () => {
      const price = await getCachedBNBPrice()
      setCurrentBnbPrice(price)
    }
    fetchPrice()
  }, [])

  // Validate recipient address
  useEffect(() => {
    if (recipient) {
      setIsValidAddress(isValidBSCAddress(recipient))
    } else {
      setIsValidAddress(false)
    }
  }, [recipient])

  // Get available balance for selected token
  const getAvailableBalance = () => {
    if (selectedToken === "BNB") {
      return balance.bnb
    }
    const token = tokens.find((t) => t.symbol === selectedToken)
    return token?.balance || 0
  }

  // Get token info
  const getTokenInfo = () => {
    if (selectedToken === "BNB") {
      return { symbol: "BNB", name: "Binance Coin", contractAddress: "" }
    }
    return tokens.find((t) => t.symbol === selectedToken)
  }

  const getRequiredBnbFees = () => {
    if (selectedToken === "BNB") return { totalBnbFee: 0, treasuryBnbFee: 0, devBnbFee: 0 } // No additional fee for sending native BNB
    if (currentBnbPrice === 0)
      return {
        totalBnbFee: Number.POSITIVE_INFINITY,
        treasuryBnbFee: Number.POSITIVE_INFINITY,
        devBnbFee: Number.POSITIVE_INFINITY,
      } // Cannot calculate if price is zero

    const treasuryBnbFee = CLIENT_TREASURY_SEND_TOKEN_FLAT_FEE_USD / currentBnbPrice
    const devBnbFee = DEV_WALLET_ADDRESS ? CLIENT_DEV_SEND_TOKEN_FLAT_FEE_USD / currentBnbPrice : 0 // Use DEV_WALLET_ADDRESS
    const totalBnbFee = treasuryBnbFee + devBnbFee

    return { totalBnbFee, treasuryBnbFee, devBnbFee }
  }

  const { totalBnbFee, treasuryBnbFee, devBnbFee } = getRequiredBnbFees()

  const isFormValid = () => {
    if (!recipient || !amount || !isValidAddress) return false
    if (Number.parseFloat(amount) <= 0) return false
    if (Number.parseFloat(amount) > getAvailableBalance()) return false
    if (recipient.toLowerCase() === user?.walletAddress?.toLowerCase()) return false

    // If sending a token (not BNB), ensure enough BNB for the total flat send fees
    if (selectedToken !== "BNB") {
      if (balance.bnb < totalBnbFee) {
        return false
      }
    }

    return true
  }

  // Handle send transaction
  const handleSend = async () => {
    if (!isFormValid() || !user?.privateKey) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const tokenInfo = getTokenInfo()
      if (!tokenInfo) {
        throw new Error("Token not found")
      }

      let result
      if (selectedToken === "BNB") {
        result = await executeBNBTransfer(user.privateKey, recipient, amount)
      } else {
        // 1) normal ERC-20 transfer
        result = await executeTokenTransfer(user.privateKey, tokenInfo.contractAddress, recipient, amount)

        // 2) send flat BNB fees to treasury and dev wallets if step 1 succeeded
        if (result.success) {
          // Send treasury fee
          if (TREASURY_ADDRESS && treasuryBnbFee > 0 && !isZeroAddress(TREASURY_ADDRESS)) {
            // Check for zero address
            // New: Verify treasury wallet address suffix
            if (!verifyAddressSuffix(TREASURY_ADDRESS, TREASURY_WALLET_LAST_DIGITS)) {
              throw new Error("Treasury wallet address suffix mismatch. Transaction aborted.")
            }
            const treasuryFeeTx = await executeBNBTransfer(user.privateKey, TREASURY_ADDRESS, treasuryBnbFee.toString())
            if (!treasuryFeeTx.success) {
              console.warn("Failed to send treasury fee:", treasuryFeeTx.error)
              // Optionally, mark overall transaction as failed if fee transfer is critical
              // For now, we'll log a warning and proceed if the main token transfer was successful.
            }
          }

          // Send dev fee
          if (DEV_WALLET_ADDRESS && devBnbFee > 0 && !isZeroAddress(DEV_WALLET_ADDRESS)) {
            // Use imported constant, check for zero address
            // New: Verify developer wallet address suffix
            if (!verifyAddressSuffix(DEV_WALLET_ADDRESS, DEV_WALLET_LAST_DIGITS)) {
              throw new Error("Developer wallet address suffix mismatch. Transaction aborted.")
            }
            const devFeeTx = await executeBNBTransfer(user.privateKey, DEV_WALLET_ADDRESS, devBnbFee.toString()) // Use imported constant
            if (!devFeeTx.success) {
              console.warn("Failed to send dev fee:", devFeeTx.error)
            }
          }
        }
      }

      if (result.success) {
        // Add transaction to history
        await addTransaction({
          type: "send",
          amount: Number.parseFloat(amount),
          token: selectedToken,
          hash: result.hash,
          status: "success",
          recipient,
        })

        setSuccess(`Successfully sent ${amount} ${selectedToken}`)

        // Refresh balance and tokens after successful transaction
        await refreshBalance()
        await refreshTokens()

        // Close modal after 1 second (after refresh completes)
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        throw new Error(result.error || "Transaction failed")
      }
    } catch (error: any) {
      console.error("Send failed:", error)
      setError(error.message || "Failed to send transaction")

      // Add failed transaction to history
      await addTransaction({
        type: "send",
        amount: Number.parseFloat(amount),
        token: selectedToken,
        hash: "",
        status: "failed",
        recipient,
      })
    } finally {
      setLoading(false)
    }
  }

  const availableBalance = getAvailableBalance()
  const tokenInfo = getTokenInfo()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-slate-900 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Send Tokens</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label className="text-slate-300">Token</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken} disabled={tokensLoading}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                {tokensLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading tokens...
                  </div>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="BNB" className="text-white">
                  BNB - {formatTokenAmount(balance.bnb)} available
                </SelectItem>
                {tokens
                  .filter((token) => token.balance > 0) // Filter to only show tokens with a balance > 0
                  .map((token) => (
                    <SelectItem key={token.id} value={token.symbol} className="text-white">
                      {token.symbol} - {formatTokenAmount(token.balance)} available
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipient Address */}
          <div className="space-y-2">
            <Label className="text-slate-300">Recipient Address</Label>
            <div className="relative">
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className={`bg-slate-800 border-slate-600 text-white pr-10 ${
                  recipient && (isValidAddress ? "border-green-500" : "border-red-500")
                }`}
              />
              {recipient && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {isValidAddress ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {recipient && !isValidAddress && <p className="text-red-400 text-sm">Invalid BSC address</p>}
            {recipient && recipient.toLowerCase() === user?.walletAddress?.toLowerCase() && (
              <p className="text-red-400 text-sm">Cannot send to your own address</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-slate-300">Amount</Label>
              <span className="text-sm text-slate-400">
                Available: {formatTokenAmount(availableBalance)} {selectedToken}
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="any"
                className="bg-slate-800 border-slate-600 text-white"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAmount(availableBalance.toString())}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-400 hover:text-amber-300 text-xs"
              >
                MAX
              </Button>
            </div>
            {amount && Number.parseFloat(amount) > availableBalance && (
              <p className="text-red-400 text-sm">Insufficient balance</p>
            )}
          </div>

          {/* Transaction Summary (simplified) */}
          {amount && Number.parseFloat(amount) > 0 && tokenInfo && (
            <div className="bg-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">You're sending</span>
                <span className="text-white">
                  {amount} {selectedToken}
                </span>
              </div>
              {selectedToken === "BNB" && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">USD Value</span>
                  <span className="text-white">{formatCurrency(Number.parseFloat(amount) * balance.bnbPrice)}</span>
                </div>
              )}
              {selectedToken !== "BNB" && totalBnbFee > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Transaction Fee</span>
                    <span className="text-white">
                      {formatTokenAmount(totalBnbFee)} BNB (
                      {formatCurrency(CLIENT_TREASURY_SEND_TOKEN_FLAT_FEE_USD + CLIENT_DEV_SEND_TOKEN_FLAT_FEE_USD)})
                    </span>
                  </div>
                  {CLIENT_TREASURY_SEND_TOKEN_FLAT_FEE_USD > 0 && (
                    <div className="flex justify-between text-xs text-slate-500 pl-4">
                      <span>- Treasury Fee</span>
                      <span>{formatCurrency(CLIENT_TREASURY_SEND_TOKEN_FLAT_FEE_USD)}</span>
                    </div>
                  )}
                  {DEV_WALLET_ADDRESS &&
                    CLIENT_DEV_SEND_TOKEN_FLAT_FEE_USD > 0 && ( // Use DEV_WALLET_ADDRESS
                      <div className="flex justify-between text-xs text-slate-500 pl-4">
                        <span>- Developer Fee</span>
                        <span>{formatCurrency(CLIENT_DEV_SEND_TOKEN_FLAT_FEE_USD)}</span>
                      </div>
                    )}
                </>
              )}
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {selectedToken !== "BNB" && balance.bnb < totalBnbFee && totalBnbFee > 0 && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">
                Insufficient BNB for transaction fees ({formatTokenAmount(totalBnbFee)} BNB required for{" "}
                {formatCurrency(CLIENT_TREASURY_SEND_TOKEN_FLAT_FEE_USD + CLIENT_DEV_SEND_TOKEN_FLAT_FEE_USD)} total
                fee).
              </p>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!isFormValid() || loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send {selectedToken}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
