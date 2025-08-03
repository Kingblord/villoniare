"use client"

import { Button } from "@/components/ui/button"
import { Store, Wallet } from "lucide-react"
import Link from "next/link"

interface BottomNavProps {
  currentPage: "flash-store" | "flash-wallet"
}

export function BottomNav({ currentPage }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-4 py-3">
      <div className="flex justify-center space-x-8">
        <Link href="/flash-store">
          <Button
            variant="ghost"
            className={`flex flex-col items-center space-y-1 px-6 py-3 rounded-xl transition-all duration-200 ${
              currentPage === "flash-store"
                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="text-xs font-medium">Flash Store</span>
          </Button>
        </Link>

        <Link href="/flash-wallet">
          <Button
            variant="ghost"
            className={`flex flex-col items-center space-y-1 px-6 py-3 rounded-xl transition-all duration-200 ${
              currentPage === "flash-wallet"
                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-xs font-medium">Flash Wallet</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
