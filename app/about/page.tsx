"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield, Zap, Wallet, Users } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            About VillonairesWorld
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Revolutionizing DeFi with instant token generation and seamless wallet management
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-200">Flash Store</h3>
            <p className="text-slate-400">
              Browse and generate flash tokens instantly. Swap BNB for various tokens with minimal fees and send them to
              any wallet.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-200">Flash Wallet</h3>
            <p className="text-slate-400">
              Manage your tokens with real-time balance tracking, send/receive functionality, and secure wallet
              operations.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-200">Secure Access</h3>
            <p className="text-slate-400">
              Firebase authentication with PIN-based access and auto-generated Web3 wallets for maximum security.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-200">Community</h3>
            <p className="text-slate-400">
              Join our Telegram community for support, updates, and connect with other flash traders.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/access">
            <Button
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
