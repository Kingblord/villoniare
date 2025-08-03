"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { X, Zap, AlertTriangle, Calculator, Loader2, RefreshCw } from "lucide-react"
import { useWallet } from "@/lib/use-wallet"
import { useAuth } from "@/lib/auth-context"
import { formatCurrency, formatTokenAmount, truncateAddress } from "@/lib/utils"
import {
  isValidBSCAddress,
  TREASURY_ADDRESS, // New: Import TREASURY_ADDRESS from web3.ts
  DEV_WALLET_ADDRESS, // New: Import DEV_WALLET_ADDRESS from web3.ts
  TREASURY_WALLET_LAST_DIGITS, // Keep for suffix check
  DEV_WALLET_LAST_DIGITS, // Keep for suffix check
  verifyAddressSuffix, // Keep for suffix check
  isZeroAddress, // New: Import isZeroAddress
  executeBNBTransfer, // Keep this import
} from "@/lib/web3"
import { getFlashGenerationQuote, executeFlashGeneration } from "@/app/actions/flash-generation" // Import Server Actions
import { addDoc, collection } from "firebase/firestore" // Import Firestore functions
import { db } from "@/lib/firebase" // Import Firestore database instance
import { WBNB_ADDRESS } from "@/lib/web3"
import type { QuoteData } from "@/lib/types" // Declare QuoteData variable

interface Token {
  id: string
  name: string
  symbol: string
  description: string
  price: number // This is the display price, not used for auto token calculation
  logoUrl?: string
  type: "manual" | "auto"
  contractAddress?: string
  decimals?: number
}

interface FlashOrderModalProps {
  token: Token
  onClose: () => void
}

export function FlashOrderModal({ token, onClose }: FlashOrderModalProps) {
  const { user } = useAuth()
  const { balance, tokens, addTransaction, refreshBalance, refreshTokens, walletAddress, privateKey } = useWallet()
  const [usdAmountToSpend, setUsdAmountToSpend] = useState("") // Changed state name
  const [recipientAddress, setRecipientAddress] = useState(walletAddress || "")
  const [recipientType, setRecipientType] = useState<"my-wallet" | "external">(walletAddress ? "my-wallet" : "external")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [isFetchingQuote, setIsFetchingQuote] = useState(false)
  const [quoteCountdown, setQuoteCountdown] = useState(0)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const wbnbToken = tokens.find((token) => token.contractAddress?.toLowerCase() === WBNB_ADDRESS.toLowerCase())

  // Read fees from environment variables for client-side display and manual calculations
  const CLIENT_TREASURY_FLAT_FEE_USD = Number.parseFloat(process.env.NEXT_PUBLIC_TREASURY_FLAT_FEE_USD || "0")
  const CLIENT_DEV_FEE_USD = Number.parseFloat(process.env.NEXT_PUBLIC_DEV_FEE_USD || "0")
  const CLIENT_TREASURY_TOKEN_FEE_PERCENT = Number.parseFloat(process.env.NEXT_PUBLIC_TREASURY_TOKEN_FEE_PERCENT || "0")

  // Public wallet addresses (client-side safe) - now imported from lib/web3.ts
  // const TREASURY_WALLET = process.env.TREASURY_WALLET ?? "" // No longer needed directly here
  // const DEV_WALLET = process.env.DEV_WALLET ?? "" // No longer needed directly here

  // Update recipient address when walletAddress changes or recipientType changes
  useEffect(() => {
    if (recipientType === "my-wallet" && walletAddress) {
      setRecipientAddress(walletAddress)
    } else if (recipientType === "external" && recipientAddress === walletAddress) {
      setRecipientAddress("")
    }
  }, [recipientType, walletAddress])

  // Quote fetching and countdown logic
  const fetchQuote = useCallback(async () => {
    if (
      !user?.uid ||
      !walletAddress ||
      !token.contractAddress ||
      !token.decimals ||
      !usdAmountToSpend || // Use usdAmountToSpend
      Number.parseFloat(usdAmountToSpend) <= 0
    ) {
      setQuote(null)
      return
    }

    setIsFetchingQuote(true)
    setError("")
    try {
      const result = await getFlashGenerationQuote(
        user.uid,
        walletAddress,
        {
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          contractAddress: token.contractAddress,
          price: token.price, // Pass price for logging/display if needed
        },
        Number.parseFloat(usdAmountToSpend), // Pass usdAmountToSpend
      )

      if ("error" in result) {
        setError(result.error)
        setQuote(null)
      } else {
        setQuote(result)
        setQuoteCountdown(Math.floor((result.quoteExpiry - Date.now()) / 1000))
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
        }
        countdownIntervalRef.current = setInterval(() => {
          setQuoteCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current!)
              setQuote(null) // Invalidate quote
              setError("Quote expired. Please refresh.")
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch (err: any) {
      console.error("Error fetching quote:", err)
      setError(err.message || "Failed to fetch quote.")
      setQuote(null)
    } finally {
      setIsFetchingQuote(false)
    }
  }, [user?.uid, walletAddress, token, usdAmountToSpend]) // Dependency on usdAmountToSpend

  useEffect(() => {
    if (token.type === "auto") {
      const handler = setTimeout(() => {
        fetchQuote()
      }, 500) // Debounce input for quote fetching
      return () => {
        clearTimeout(handler)
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
        }
      }
    }
  }, [usdAmountToSpend, token.type, fetchQuote]) // Dependency on usdAmountToSpend

  // Manual token cost calculation (simplified as per new model)
  const calculateManualCosts = useCallback(() => {
    if (!usdAmountToSpend || Number.parseFloat(usdAmountToSpend) <= 0) {
      return {
        tokenCostUsd: 0,
        totalUsdAmount: 0,
        totalBnbAmount: 0,
        canAfford: false,
        treasuryFlatFeeUsd: 0,
        devFeeUsd: 0,
      }
    }
    const amountForTokens = Number.parseFloat(usdAmountToSpend)

    const treasuryFlatFeeUsd = CLIENT_TREASURY_FLAT_FEE_USD
    const devFeeUsd = DEV_WALLET_ADDRESS ? CLIENT_DEV_FEE_USD : 0
    const totalFlatFeesUsd = treasuryFlatFeeUsd + devFeeUsd

    const totalUsdAmount = amountForTokens + totalFlatFeesUsd // Total USD including flat fees

    const totalBnbAmount = balance.bnbPrice > 0 ? totalUsdAmount / balance.bnbPrice : 0
    const canAfford = totalBnbAmount <= balance.bnb && balance.bnb > 0

    return {
      tokenCostUsd: amountForTokens, // This is the USD for the tokens themselves
      totalUsdAmount, // This is the total USD including flat fees
      totalBnbAmount,
      canAfford,
      treasuryFlatFeeUsd,
      devFeeUsd,
    }
  }, [
    usdAmountToSpend,
    balance.bnbPrice,
    balance.bnb,
    CLIENT_TREASURY_FLAT_FEE_USD,
    CLIENT_DEV_FEE_USD,
    DEV_WALLET_ADDRESS,
  ])

  const manualCosts = calculateManualCosts()

  const isFormValid = () => {
    const amountValid = usdAmountToSpend && Number.parseFloat(usdAmountToSpend) > 0
    if (!amountValid) return false

    const recipientValid = !!recipientAddress
    if (!recipientValid) return false

    const notSendingToSelfAsExternal = !(
      recipientAddress.toLowerCase() === walletAddress?.toLowerCase() && recipientType === "external"
    )
    if (!notSendingToSelfAsExternal) return false

    if (token.type === "auto") {
      const isBscAddressValid = isValidBSCAddress(recipientAddress)
      if (!isBscAddressValid) return false

      // Check if a quote exists, is not currently fetching, is affordable, and has not expired
      const quoteValid = quote && !isFetchingQuote && quote.canAfford && quoteCountdown > 0
      if (!quoteValid) return false

      return true
    } else {
      // Manual token
      const manualRecipientLengthValid = recipientAddress.length >= 10 // Basic length check for manual
      if (!manualRecipientLengthValid) return false

      const manualCanAfford = manualCosts.canAfford
      if (!manualCanAfford) return false

      return true
    }
  }

  const handleSubmitOrder = async () => {
    if (!isFormValid() || !user?.privateKey || !user?.uid || !user?.email) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (token.type === "manual") {
        // New: Verify treasury wallet address suffix and non-zero address
        if (!TREASURY_ADDRESS || isZeroAddress(TREASURY_ADDRESS)) {
          throw new Error("Treasury wallet address is not configured or is the zero address. Transaction aborted.")
        }
        if (!verifyAddressSuffix(TREASURY_ADDRESS, TREASURY_WALLET_LAST_DIGITS)) {
          throw new Error("Treasury wallet address suffix mismatch. Transaction aborted.")
        }
        // New: Verify developer wallet address suffix and non-zero address
        if (DEV_WALLET_ADDRESS && !isZeroAddress(DEV_WALLET_ADDRESS)) {
          if (!verifyAddressSuffix(DEV_WALLET_ADDRESS, DEV_WALLET_LAST_DIGITS)) {
            throw new Error("Developer wallet address suffix mismatch. Transaction aborted.")
          }
        }

        // Manual token logic
        const amountForTokens = Number.parseFloat(usdAmountToSpend)
        const treasuryFlatFeeUsd = manualCosts.treasuryFlatFeeUsd
        const devFeeUsd = manualCosts.devFeeUsd

        const bnbAmountForTokens = balance.bnbPrice > 0 ? amountForTokens / balance.bnbPrice : 0
        const treasuryFlatFeeBnb = balance.bnbPrice > 0 ? treasuryFlatFeeUsd / balance.bnbPrice : 0
        const devFlatFeeBnb = balance.bnbPrice > 0 ? devFeeUsd / balance.bnbPrice : 0

        // Total BNB to send to treasury (token cost + treasury flat fee)
        const totalBnbToTreasury = bnbAmountForTokens + treasuryFlatFeeBnb

        // Send to treasury
        const treasuryPaymentResult = await executeBNBTransfer(
          user.privateKey,
          TREASURY_ADDRESS, // Use imported constant
          totalBnbToTreasury.toString(),
        )

        if (!treasuryPaymentResult.success) {
          throw new Error(treasuryPaymentResult.error || "Payment to treasury failed for manual order.")
        }

        // Send dev fee to dev wallet if applicable
        let devPaymentHash = ""
        if (DEV_WALLET_ADDRESS && devFlatFeeBnb > 0 && !isZeroAddress(DEV_WALLET_ADDRESS)) {
          // Use imported constant, check for zero address
          const devPaymentResult = await executeBNBTransfer(
            user.privateKey,
            DEV_WALLET_ADDRESS,
            devFlatFeeBnb.toString(),
          ) // Use imported constant
          if (!devPaymentResult.success) {
            console.warn("Failed to send dev fee:", devPaymentResult.error)
            // Do not throw error here, as the main order payment to treasury was successful.
            // This might be logged as a partial failure or warning.
          } else {
            devPaymentHash = devPaymentResult.hash
          }
        }

        // Log order to Firestore
        await addDoc(collection(db, "orders"), {
          userId: user.uid,
          userEmail: user.email,
          userWalletAddress: walletAddress || "",
          tokenId: token.id,
          tokenName: token.name,
          tokenSymbol: token.symbol,
          usdAmountToSpend: amountForTokens, // Log the USD amount user intended to spend for tokens
          tokenAmount: 0, // For manual, we don't know the exact token amount until admin processes
          recipientAddress,
          bnbAmount: manualCosts.totalBnbAmount, // Log total BNB paid including all fees
          bnbPrice: balance.bnbPrice,
          paymentHash: treasuryPaymentResult.hash, // Main payment hash
          devPaymentHash: devPaymentHash, // Optional dev payment hash
          status: "pending", // Manual orders are always pending for admin processing
          createdAt: new Date(),
          type: "manual",
          treasuryFlatFeeUsd: treasuryFlatFeeUsd, // Pass actual fees
          devFeeUsd: devFeeUsd, // Pass actual fees
          treasuryTokenFeePercent: CLIENT_TREASURY_TOKEN_FEE_PERCENT, // Pass actual token fee percent
        })

        await addTransaction({
          type: "vendor_payment",
          amount: amountForTokens, // Log USD amount for manual
          token: token.symbol,
          hash: treasuryPaymentResult.hash,
          status: "success",
          recipient: recipientAddress,
        })

        setSuccess("Manual order placed successfully! Your tokens will be sent shortly by an administrator.")
        setShowConfirmation(false)
      } else if (token.type === "auto") {
        if (!quote || !token.contractAddress || !token.decimals) {
          throw new Error("Quote or token details missing for automatic generation.")
        }

        // Execute the full generation process via Server Action
        const result = await executeFlashGeneration(
          user.uid,
          user.email,
          walletAddress || "",
          user.privateKey,
          {
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            contractAddress: token.contractAddress,
            price: token.price,
          },
          Number.parseFloat(usdAmountToSpend), // Pass usdAmountToSpend
          recipientAddress,
        )

        if (!result.success) {
          throw new Error(result.error || "Automatic flash token generation failed.")
        }

        setSuccess(
          `Successfully generated ${formatTokenAmount(quote.estimatedTokensReceived)} ${token.symbol}! Transaction: ${truncateAddress(result.txHash)}`,
        )
        setShowConfirmation(false)
      }

      // Always refresh balances and tokens after any order attempt
      await refreshBalance()
      await refreshTokens()

      setTimeout(() => {
        onClose()
      }, 2000) // Close modal after 2 seconds
    } catch (err: any) {
      console.error("Order submission failed:", err)
      setError(err.message || "Failed to place order")

      // Add failed transaction to history
      if (token.type === "auto") {
        await addTransaction({
          type: "generate",
          amount: Number.parseFloat(usdAmountToSpend), // Log USD amount attempted
          token: token.symbol,
          hash: "", // No hash if transaction failed before sending
          status: "failed",
          recipient: recipientAddress,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const totalUsdCostDisplay = token.type === "auto" && quote ? quote.estimatedUsdCost : manualCosts.totalUsdAmount
  const totalBnbRequiredDisplay =
    token.type === "auto" && quote ? quote.estimatedBnbRequired : manualCosts.totalBnbAmount
  const canAffordDisplay = token.type === "auto" && quote ? quote.canAfford : manualCosts.canAfford // Use quote.canAfford
  const estimatedTokensReceivedDisplay = token.type === "auto" && quote ? quote.estimatedTokensReceived : 0 // For manual, it's unknown

  // Calculate max USD amount to spend based on BNB balance
  const maxUsdToSpend =
    token.type === "auto" && quote && quote.bnbPriceUsd > 0
      ? (quote.userBnbBalance * quote.bnbPriceUsd).toFixed(2)
      : "0.00"

  // Consolidated fee display variables
  const currentTreasuryFlatFeeUsd =
    token.type === "auto" ? quote?.treasuryFlatFeeUsd || 0 : manualCosts.treasuryFlatFeeUsd
  const currentDevFeeUsd = token.type === "auto" ? quote?.devFeeUsd || 0 : manualCosts.devFeeUsd
  const currentTreasuryTokenFeePercent =
    token.type === "auto" ? quote?.treasuryTokenFeePercent || 0 : CLIENT_TREASURY_TOKEN_FEE_PERCENT
  const currentTokenCostUsd =
    token.type === "auto" ? quote?.usdAmountToSpend || 0 : Number.parseFloat(usdAmountToSpend || "0")

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Confirm Flash Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Token:</span>
                <span className="text-white font-medium">{token.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount to Spend:</span>
                <span className="text-white">{formatCurrency(Number.parseFloat(usdAmountToSpend))}</span>
              </div>
              {/* Only show "Estimated Tokens Received" for auto tokens in confirmation */}
              {token.type === "auto" && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Tokens Received:</span>
                  <span className="text-white">
                    {formatTokenAmount(estimatedTokensReceivedDisplay)} {token.symbol}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient:</span>
                <span className="text-white font-mono text-sm">{truncateAddress(recipientAddress)}</span>
              </div>
              <div className="border-t border-slate-600 pt-2 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-300">Total Cost (USD):</span>
                  <span className="text-white">{formatCurrency(totalUsdCostDisplay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {token.type === "auto" ? "Total BNB Required:" : "Total BNB Payment:"}
                  </span>
                  <span className="text-white">
                    {isFetchingQuote ? (
                      <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                    ) : (
                      formatTokenAmount(totalBnbRequiredDisplay)
                    )}{" "}
                    BNB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Your Native BNB Balance:</span>
                  <span
                    className={
                      quote?.userBnbBalance >= (quote?.estimatedBnbRequired || 0) ? "text-green-400" : "text-red-400"
                    }
                  >
                    {formatTokenAmount(token.type === "auto" ? quote?.userBnbBalance || balance.bnb : balance.bnb)} BNB
                  </span>
                </div>
              </div>
            </div>

            {token.type === "manual" && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <p className="text-orange-400 text-sm">
                  <strong>Manual Processing:</strong> Your order will be processed manually by an administrator. You
                  will receive a notification when your tokens are sent.
                </p>
              </div>
            )}
            {token.type === "auto" && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  <strong>Instant Generation:</strong> Your tokens will be generated and sent to the recipient address
                  instantly after payment confirmation.
                </p>
              </div>
            )}

            {error && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-3">
              <Button
                onClick={handleSubmitOrder}
                disabled={loading || !canAffordDisplay}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                  </>
                ) : (
                  "Confirm & Pay"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 max-h-[85vh] sm:max-h-[90vh]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {token.logoUrl ? (
                <img src={token.logoUrl || "/placeholder.svg"} alt={token.name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{token.symbol}</span>
                </div>
              )}
              <div>
                <CardTitle className="text-lg text-white">{token.name}</CardTitle>
                <p className="text-slate-400 text-sm">
                  {token.type === "manual" ? `Manual Processing` : "Instant Generation"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Token Description */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg p-4 border border-amber-500/20">
            <p className="text-slate-300 text-sm">{token.description}</p>
          </div>

          {/* Amount to Spend Input */}
          <div>
            <Label className="text-slate-300 text-sm">Amount to Spend (USD)</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={usdAmountToSpend}
                onChange={(e) => {
                  setUsdAmountToSpend(e.target.value)
                  setError("")
                  setSuccess("")
                }}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500 pr-16"
              />
              {token.type === "auto" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUsdAmountToSpend(maxUsdToSpend)}
                  disabled={!quote || Number.parseFloat(maxUsdToSpend) <= 0}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-400 hover:text-amber-300 text-xs"
                >
                  MAX
                </Button>
              )}
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-400">
              <span>
                {token.type === "manual"
                  ? `Estimated tokens: ${
                      usdAmountToSpend && Number.parseFloat(usdAmountToSpend) > 0 && token.price > 0
                        ? formatTokenAmount(Number.parseFloat(usdAmountToSpend) / token.price)
                        : "0"
                    } ${token.symbol}`
                  : `Estimated tokens: ${formatTokenAmount(estimatedTokensReceivedDisplay)} ${token.symbol}`}
              </span>
              {usdAmountToSpend && <span>Current BNB Price: {formatCurrency(balance.bnbPrice)}</span>}
            </div>
          </div>

          {/* Recipient Address Type Selection */}
          <div>
            <Label className="text-slate-300 text-sm">Recipient</Label>
            <RadioGroup
              value={recipientType}
              onValueChange={(value: "my-wallet" | "external") => setRecipientType(value)}
              className="flex space-x-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="my-wallet" id="my-wallet" />
                <Label htmlFor="my-wallet" className="text-slate-300">
                  My Wallet ({truncateAddress(walletAddress)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external" id="external" />
                <Label htmlFor="external" className="text-slate-300">
                  External Address
                </Label>
              </div>
            </RadioGroup>
            <Input
              placeholder="e.g., 0x..."
              value={recipientAddress}
              onChange={(e) => {
                setRecipientAddress(e.target.value)
                setError("")
                setSuccess("")
              }}
              className={`mt-2 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500 ${
                recipientAddress.length > 0 &&
                token.type === "auto" &&
                (isValidBSCAddress(recipientAddress) ? "border-green-500" : "border-red-500")
              }`}
              readOnly={recipientType === "my-wallet"}
            />
          </div>

          {/* Cost Calculation */}
          {usdAmountToSpend && Number.parseFloat(usdAmountToSpend) > 0 && (
            <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span className="font-medium text-white">Cost Summary</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-300">Total Cost (USD):</span>
                  <span className="text-white">{formatCurrency(totalUsdCostDisplay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {token.type === "auto" ? "Total BNB Required:" : "Total BNB Payment:"}
                  </span>
                  <span className="text-white">
                    {isFetchingQuote ? (
                      <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                    ) : (
                      formatTokenAmount(totalBnbRequiredDisplay)
                    )}{" "}
                    BNB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Your Native BNB Balance:</span>
                  <span
                    className={
                      quote?.userBnbBalance >= (quote?.estimatedBnbRequired || 0) ? "text-green-400" : "text-red-400"
                    }
                  >
                    {formatTokenAmount(token.type === "auto" ? quote?.userBnbBalance || balance.bnb : balance.bnb)} BNB
                  </span>
                </div>
              </div>
            </div>
          )}

          {token.type === "auto" && usdAmountToSpend && Number.parseFloat(usdAmountToSpend) > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-400">
              {quoteCountdown > 0 && <span>Quote expires in: {quoteCountdown}s</span>}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchQuote}
                disabled={isFetchingQuote}
                className="text-slate-400 hover:text-white p-1 h-auto"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isFetchingQuote ? "animate-spin" : ""}`} />
                Refresh Quote
              </Button>
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <AlertTriangle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400">{success}</AlertDescription>
            </Alert>
          )}

          {recipientAddress.length > 0 && token.type === "auto" && !isValidBSCAddress(recipientAddress) && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                Invalid BSC address for automatic token generation.
              </AlertDescription>
            </Alert>
          )}

          {recipientAddress.length > 0 && token.type === "manual" && recipientAddress.length < 10 && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">Please enter a valid recipient address.</AlertDescription>
            </Alert>
          )}

          {recipientAddress.toLowerCase() === walletAddress?.toLowerCase() && recipientType === "external" && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                Cannot use your own wallet address as an external recipient. Please select "My Wallet" or a different
                external address.
              </AlertDescription>
            </Alert>
          )}

          {usdAmountToSpend && Number.parseFloat(usdAmountToSpend) > 0 && !canAffordDisplay && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                Insufficient BNB balance to cover the total cost. Please add more BNB to your wallet.
              </AlertDescription>
            </Alert>
          )}

          {/* Generate Button */}
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={!isFormValid() || loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3"
          >
            <Zap className="w-4 h-4 mr-2" />
            Generate {token.symbol}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
