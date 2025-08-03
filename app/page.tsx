"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { InstallAppButton } from "@/components/install-app-button"
import { usePWA } from "@/lib/pwa-context"

export default function LandingPage() {
  const { isStandalone } = usePWA()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col justify-center items-center text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <Image
              src="/images/villonaires-logo.png"
              alt="VillonairesWorld Logo"
              width={120}
              height={120}
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            VillonairesWorld
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-2">Flash Trading Revolution</p>
          <p className="text-base md:text-lg text-slate-400 max-w-md mx-auto">
            Experience instant token generation and seamless wallet management in the next generation of DeFi
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm mb-6">
          <Link href="/access" className="flex-1">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/about" className="flex-1">
            <Button
              variant="outline"
              size="lg"
              className="w-full border-2 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white font-semibold py-4 rounded-xl transition-all duration-200 bg-transparent"
            >
              Explore
            </Button>
          </Link>
        </div>

        {/* Install App Button - Only show if not already installed */}
        {!isStandalone && (
          <div className="mb-8">
            <InstallAppButton />
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-slate-200 mb-1">Instant Flash</h3>
            <p className="text-sm text-slate-400">Generate tokens instantly</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-slate-200 mb-1">Secure Wallet</h3>
            <p className="text-sm text-slate-400">Auto-generated Web3 wallet</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 border-2 border-amber-400 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-slate-200 mb-1">Low Fees</h3>
            <p className="text-sm text-slate-400">Minimal transaction costs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
