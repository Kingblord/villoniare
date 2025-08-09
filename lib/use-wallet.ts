"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { onSnapshot, collection, query, where, orderBy, addDoc, getDocs } from "firebase/firestore"
import { createWallet, getBNBBalance, getTokenBalance, getBNBPriceUSD } from "@/lib/web3"
import { useNotifications } from "./use-notifications"
import type { Transaction } from "./types"

interface TokenBalance {
  contractAddress: string
  symbol: string
  balance: number
  decimals: number
  priceUsd: number // Price of the token in USD
  logoUrl?: string
}

interface WalletBalance {
  bnb: number
  bnbPrice: number
  totalUsd: number
  tokens: TokenBalance[]
}

export function useWallet() {
  const { user, userWalletAddress, privateKey, loading: authLoading } = useAuth()
  const [balance, setBalance] = useState<WalletBalance>({
    bnb: 0,
    bnbPrice: 0,
    totalUsd: 0,
    tokens: [],
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addNotification } = useNotifications()

  const walletAddress = userWalletAddress
  const signer = privateKey ? createWallet(privateKey) : null

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const bnbBalance = await getBNBBalance(walletAddress)
      const bnbPrice = await getBNBPriceUSD()

      // Fetch all active tokens from Firestore
      const tokensCollection = collection(db, "tokens")
      const tokensSnapshot = await getDocs(tokensCollection)
      const activeTokens = tokensSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[] // Use any for now, cast later

      let totalUsdValue = bnbBalance * bnbPrice
      const tokenBalances: TokenBalance[] = []

      for (const token of activeTokens) {
        if (token.type === "auto" && token.contractAddress && token.decimals !== undefined) {
          const tokenBal = await getTokenBalance(token.contractAddress, walletAddress)
          const tokenUsdValue = tokenBal * token.price // Use the price from Firestore for calculation
          totalUsdValue += tokenUsdValue
          tokenBalances.push({
            contractAddress: token.contractAddress,
            symbol: token.symbol,
            balance: tokenBal,
            decimals: token.decimals,
            priceUsd: token.price,
            logoUrl: token.logoUrl,
          })
        }
      }

      setBalance({
        bnb: bnbBalance,
        bnbPrice: bnbPrice,
        totalUsd: totalUsdValue,
        tokens: tokenBalances,
      })
    } catch (err: any) {
      console.error("Error refreshing wallet balance:", err)
      setError("Failed to refresh wallet balance: " + err.message)
      addNotification({
        id: Date.now(),
        type: "error",
        message: "Failed to refresh wallet balance.",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }, [walletAddress, addNotification])

  const refreshTokens = useCallback(async () => {
    if (!walletAddress) {
      return
    }
    try {
      const tokensCollection = collection(db, "tokens")
      const tokensSnapshot = await getDocs(tokensCollection)
      const activeTokens = tokensSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[]

      let totalUsdValue = balance.bnb * balance.bnbPrice // Start with current BNB value
      const tokenBalances: TokenBalance[] = []

      for (const token of activeTokens) {
        if (token.type === "auto" && token.contractAddress && token.decimals !== undefined) {
          const tokenBal = await getTokenBalance(token.contractAddress, walletAddress)
          const tokenUsdValue = tokenBal * token.price
          totalUsdValue += tokenUsdValue
          tokenBalances.push({
            contractAddress: token.contractAddress,
            symbol: token.symbol,
            balance: tokenBal,
            decimals: token.decimals,
            priceUsd: token.price,
            logoUrl: token.logoUrl,
          })
        }
      }

      setBalance((prev) => ({
        ...prev,
        totalUsd: totalUsdValue,
        tokens: tokenBalances,
      }))
    } catch (err) {
      console.error("Error refreshing token balances:", err)
    }
  }, [walletAddress, balance.bnb, balance.bnbPrice])

  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, "id" | "timestamp" | "userId">) => {
      if (!user?.uid) return
      try {
        await addDoc(collection(db, "transactions"), {
          ...transaction,
          userId: user.uid,
          timestamp: new Date(),
        })
      } catch (err) {
        console.error("Failed to add transaction to Firestore:", err)
      }
    },
    [user?.uid],
  )

  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  useEffect(() => {
    let unsubscribe: () => void

    const setupTransactionsListener = () => {
      if (authLoading || !user?.uid) {
        setTransactions([]) // Clear transactions if no user or still loading auth
        return
      }

      setLoading(true)
      setError(null)

      try {
        const q = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid), // Filter by current user's ID
          orderBy("timestamp", "desc"),
        )

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const fetchedTransactions: Transaction[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate(), // Convert Firestore Timestamp to Date
            })) as Transaction[]
            setTransactions(fetchedTransactions)
            setLoading(false)
          },
          (err) => {
            console.error("Error fetching transactions:", err)
            setError("Failed to load transactions.")
            setLoading(false)
          },
        )
      } catch (err: any) {
        console.error("Error setting up transactions listener:", err)
        setError("Failed to set up transaction listener: " + err.message)
        setLoading(false)
      }
    }

    setupTransactionsListener()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user?.uid, authLoading]) // Re-run when user ID or auth loading state changes

  return {
    balance,
    transactions,
    loading,
    error,
    walletAddress,
    privateKey,
    signer,
    refreshBalance,
    refreshTokens,
    addTransaction,
  }
}
