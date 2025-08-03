"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Search, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { isValidBSCAddress, getTokenInfo } from "@/lib/web3"
import { useAuth } from "@/lib/auth-context"
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ErrorAlert } from "./error-alert"

interface ImportTokenModalProps {
  onClose: () => void
}

export function ImportTokenModal({ onClose }: ImportTokenModalProps) {
  const { user } = useAuth()
  const [contractAddress, setContractAddress] = useState("")
  const [tokenDetails, setTokenDetails] = useState<{ name: string; symbol: string; decimals: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isAddressValid, setIsAddressValid] = useState(false)

  useEffect(() => {
    const validateAndFetch = async () => {
      setError("")
      setTokenDetails(null)
      if (contractAddress.length === 0) {
        setIsAddressValid(false)
        return
      }

      const valid = isValidBSCAddress(contractAddress)
      setIsAddressValid(valid)

      if (valid) {
        setLoading(true)
        try {
          const info = await getTokenInfo(contractAddress)
          if (info) {
            setTokenDetails(info)
            setSuccess("Token details fetched successfully!")
          } else {
            setError("Could not fetch token details. Ensure it is a valid ERC-20 token on BSC.")
          }
        } catch (err) {
          console.error("Error fetching token info:", err)
          setError("Failed to fetch token details. Network error or invalid contract.")
        } finally {
          setLoading(false)
        }
      } else if (contractAddress.length > 0) {
        setError("Invalid BSC contract address.")
      }
    }

    const handler = setTimeout(() => {
      validateAndFetch()
    }, 500) // Debounce input

    return () => clearTimeout(handler)
  }, [contractAddress])

  const handleImportToken = async () => {
    if (!user?.uid || !tokenDetails || !isAddressValid) {
      setError("Please provide a valid token contract address and ensure details are fetched.")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        const existingTrackedTokens = userData.trackedTokens || []

        // Check if token is already tracked by contract address
        const alreadyTracked = existingTrackedTokens.some(
          (t: any) => t.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
        )

        if (alreadyTracked) {
          setError("This token is already in your tracked list.")
          setLoading(false)
          return
        }
      }

      await updateDoc(userDocRef, {
        trackedTokens: arrayUnion({
          contractAddress: contractAddress,
          name: tokenDetails.name,
          symbol: tokenDetails.symbol,
          decimals: Number(tokenDetails.decimals), // Ensure decimals is a standard number
          importedAt: new Date(),
        }),
      })

      setSuccess("Token imported successfully! It will appear in your wallet shortly.")
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error("Error importing token:", err)
      setError("Failed to import token. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md bg-slate-800 border-slate-700 max-h-[80vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Import Token
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto max-h-[60vh] px-4">
          <p className="text-slate-400 text-sm">
            Enter the contract address of any ERC-20 token on Binance Smart Chain (BSC) to track its balance in your
            wallet.
          </p>

          <div>
            <Label htmlFor="contractAddress" className="text-slate-300">
              Token Contract Address
            </Label>
            <div className="relative">
              <Input
                id="contractAddress"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
                className={`pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500 ${
                  contractAddress.length > 0 && (isAddressValid ? "border-green-500" : "border-red-500")
                }`}
                required
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              {loading && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-slate-400" />}
              {contractAddress.length > 0 &&
                !loading &&
                (isAddressValid ? (
                  <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="absolute right-3 top-3 w-4 h-4 text-red-500" />
                ))}
            </div>
            {error && <ErrorAlert message={error} type="error" onClose={() => setError("")} />}
            {success && <ErrorAlert message={success} type="success" onClose={() => setSuccess("")} />}
          </div>

          {tokenDetails && (
            <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Name:</span>
                <span className="text-white">{tokenDetails.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Symbol:</span>
                <span className="text-white">{tokenDetails.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Decimals:</span>
                <span className="text-white">{tokenDetails.decimals}</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleImportToken}
            disabled={!tokenDetails || loading || !isAddressValid}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...
              </>
            ) : (
              "Import Token"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
