"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Update the Token interface to include price and remove contract-related fields
export interface Token {
  id: string
  name: string
  symbol: string
  description: string
  price: number // Price per token in USD
  logoUrl?: string
  createdAt: Date
  active: boolean
  type: "manual" | "auto" // New field
  contractAddress?: string // New field, required for "auto" type
  decimals?: number // Add decimals here
}

// Remove the type field and contractAddress since we're not using contracts anymore
export function useTokens() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    try {
      const tokensQuery = query(collection(db, "tokens"), where("active", "==", true))
      const snapshot = await getDocs(tokensQuery)
      const tokensData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        type: doc.data().type || "manual", // Default to manual if not set
        contractAddress: doc.data().contractAddress || undefined,
        decimals: doc.data().decimals || 18, // Default to 18 if not set
      })) as Token[]

      tokensData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setTokens(tokensData)
    } catch (error) {
      console.error("Error fetching tokens:", error)
    } finally {
      setLoading(false)
    }
  }

  return { tokens, loading, refetch: fetchTokens }
}
