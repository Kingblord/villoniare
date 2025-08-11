"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { isValidBSCAddress, TREASURY_ADDRESS } from "@/lib/web3" // Import TREASURY_ADDRESS from web3.ts

// Update interfaces to remove contract-related fields and add price management
interface Token {
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

interface Order {
  id: string
  userId: string
  userEmail: string
  userWalletAddress: string
  tokenId: string
  tokenName: string
  tokenSymbol: string
  tokenAmount: number
  recipientAddress: string
  usdAmount: number
  bnbAmount: number
  bnbPrice: number
  paymentHash: string
  status: "pending" | "completed"
  createdAt: Date
  completedAt?: Date
  type: "manual" | "auto" // New field
}

// Remove contract-related functions and simplify token management
export function useAdmin() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [treasuryAddress, setTreasuryAddress] = useState("")
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchTokens()
      setupOrdersListener()
      loadTreasuryAddress()
    }
  }, [user])

  const loadTreasuryAddress = () => {
    // Use the imported TREASURY_ADDRESS constant which now correctly uses NEXT_PUBLIC_
    setTreasuryAddress(TREASURY_ADDRESS)
  }

  const updateTreasuryAddress = (address: string) => {
    // This function is for updating the local state and localStorage, not the env var directly
    setTreasuryAddress(address)
    // Note: localStorage is client-side only. If this address needs to persist across sessions
    // for admin, it should ideally be stored in a database or managed via a server action.
    // For now, keeping it as is, but it won't update the NEXT_PUBLIC_TREASURY_WALLET env var.
    localStorage.setItem("treasuryAddress", address)
  }

  const fetchTokens = async () => {
    try {
      // Use a simpler query that doesn't require a composite index
      const tokensQuery = query(collection(db, "tokens"))
      const snapshot = await getDocs(tokensQuery)
      const tokensData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(), // Convert Firestore timestamp
        decimals: doc.data().decimals || 18, // Default to 18 if not set
      })) as Token[]

      // Sort by createdAt in JavaScript instead of Firestore
      tokensData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setTokens(tokensData)
    } catch (error) {
      console.error("Error fetching tokens:", error)
    } finally {
      setLoading(false)
    }
  }

  const setupOrdersListener = () => {
    // Remove orderBy to avoid composite index requirement
    const ordersQuery = query(collection(db, "orders"))
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(), // Handle Firestore timestamp
        completedAt: doc.data().completedAt?.toDate?.() || null,
      })) as Order[]

      // Sort by createdAt in JavaScript instead of Firestore
      ordersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setOrders(ordersData)
    })

    return unsubscribe
  }

  // Remove contract configuration and simplify token management
  const addToken = async (tokenData: Omit<Token, "id" | "createdAt" | "active">) => {
    if (!user) throw new Error("Not authenticated")

    // Validate contractAddress for auto tokens
    if (tokenData.type === "auto" && !isValidBSCAddress(tokenData.contractAddress || "")) {
      throw new Error("Contract address is required and must be a valid BSC address for auto tokens.")
    }
    if (tokenData.type === "auto" && (tokenData.decimals === undefined || tokenData.decimals < 0)) {
      throw new Error("Decimals are required and must be a non-negative number for auto tokens.")
    }

    const newToken: any = {
      // Use 'any' temporarily for conditional properties
      name: tokenData.name,
      symbol: tokenData.symbol,
      description: tokenData.description,
      price: tokenData.price,
      logoUrl: tokenData.logoUrl || null, // Ensure logoUrl is not undefined
      type: tokenData.type,
      createdAt: new Date(),
      active: true,
    }

    if (tokenData.type === "auto") {
      newToken.contractAddress = tokenData.contractAddress
      newToken.decimals = tokenData.decimals
    } else {
      // For manual tokens, ensure contractAddress and decimals are explicitly null
      newToken.contractAddress = null
      newToken.decimals = null
    }

    const docRef = await addDoc(collection(db, "tokens"), newToken)
    setTokens((prev) => [{ id: docRef.id, ...newToken }, ...prev])
  }

  const updateToken = async (tokenId: string, updates: Partial<Token>) => {
    if (!user) throw new Error("Not authenticated")

    const currentToken = tokens.find((t) => t.id === tokenId)
    if (!currentToken) throw new Error("Token not found for update.")

    const updatedType = updates.type || currentToken.type

    // Validate contractAddress for auto tokens if type is being changed or already auto
    if (updatedType === "auto") {
      const contractAddressToValidate =
        updates.contractAddress !== undefined ? updates.contractAddress : currentToken.contractAddress
      if (!isValidBSCAddress(contractAddressToValidate || "")) {
        throw new Error("Contract address is required and must be a valid BSC address for auto tokens.")
      }
      const decimalsToValidate = updates.decimals !== undefined ? updates.decimals : currentToken.decimals
      if (decimalsToValidate === undefined || decimalsToValidate < 0) {
        throw new Error("Decimals are required and must be a non-negative number for auto tokens.")
      }
    }

    const updatesPayload: any = { ...updates } // Start with all updates

    if (updatedType === "manual") {
      // If switching to manual or already manual, ensure contractAddress and decimals are null
      updatesPayload.contractAddress = null
      updatesPayload.decimals = null
    } else if (updatedType === "auto") {
      // Ensure contractAddress and decimals are present for auto tokens if not explicitly updated
      if (updates.contractAddress === undefined) updatesPayload.contractAddress = currentToken.contractAddress
      if (updates.decimals === undefined) updatesPayload.decimals = currentToken.decimals
    }

    await updateDoc(doc(db, "tokens", tokenId), updatesPayload)
    setTokens((prev) => prev.map((token) => (token.id === tokenId ? { ...token, ...updates } : token)))
  }

  const deleteToken = async (tokenId: string) => {
    if (!user) throw new Error("Not authenticated")

    await deleteDoc(doc(db, "tokens", tokenId))
    setTokens((prev) => prev.filter((token) => token.id !== tokenId))
  }

  const markOrderCompleted = async (orderId: string) => {
    if (!user) throw new Error("Not authenticated")

    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "completed",
        completedAt: new Date(),
      })

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: "completed" as const, completedAt: new Date() } : order,
        ),
      )
    } catch (error) {
      console.error("Error marking order as completed:", error)
      throw error
    }
  }

  return {
    tokens,
    orders,
    loading,
    treasuryAddress,
    addToken,
    updateToken,
    deleteToken,
    markOrderCompleted,
    updateTreasuryAddress,
    refetch: () => {
      fetchTokens()
    },
  }
}
