"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, ArrowDownLeft, Copy, Check } from "lucide-react"
import { useWallet } from "@/lib/use-wallet"

interface ReceiveModalProps {
  onClose: () => void
}

export function ReceiveModal({ onClose }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false)
  const { walletAddress } = useWallet()

  const handleCopy = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
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
            <CardTitle className="text-lg text-white flex items-center">
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Receive Tokens
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto max-h-[60vh] px-4">
          <div className="text-center">
            <p className="text-slate-400 mb-4 text-sm">Share this address to receive tokens</p>

            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
              <div className="text-white font-mono text-sm break-all mb-3">{walletAddress || "Loading..."}</div>

              <Button
                onClick={handleCopy}
                disabled={!walletAddress}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-400 text-sm">
              <strong>Important:</strong> Only send BNB and supported flash tokens to this address. Sending other tokens
              may result in permanent loss.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={onClose}
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl bg-transparent"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
