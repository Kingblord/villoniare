"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, where } from "firebase/firestore" // Added 'where'
import { getBNBBalance, getTokenBalance } from "@/lib/web3"
import { useAuth } from "@/lib/auth-context"
import { fetchBNBPriceWithFallbacks, getCachedBNBPrice } from "@/lib/price-fetcher"

interface Token {
  id: string
  name: string
  symbol: string
  contractAddress: string
  decimals: number
  balance: number
  price: number // Price from Firestore
  type: "manual" | "auto"
}

interface Balance {
  bnb: number
  bnbPrice: number
  totalUsd: number
}

interface Transaction {
  id?: string
  userId: string
  type: "send" | "receive" | "generate" | "vendor_payment" | "wrap" | "unwrap"
  amount: number
  token: string
  hash: string
  status: "pending" | "completed" | "failed"
  recipient?: string
  sender?: string
  timestamp: Date
}

export function useWallet() {
  const { user, loading: authLoading } = useAuth() // Get authLoading state
  const [balance, setBalance] = useState<Balance>({ bnb: 0, bnbPrice: 0, totalUsd: 0 })
  const [tokens, setTokens] = useState<Token[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [tokensLoading, setTokensLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [privateKey, setPrivateKey] = useState<string | null>(null)
  const bnbPriceRef = useRef(0)

  // Fetch BNB price periodically
  useEffect(() => {
    const fetchPrice = async () => {
      const price = await fetchBNBPriceWithFallbacks()
      bnbPriceRef.current = price
      setBalance((prev) => ({ ...prev, bnbPrice: price }))
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, 60 * 1000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  // Initialize wallet and fetch data
  useEffect(() => {
    if (authLoading) return // Wait for auth to complete

    if (user?.privateKey && user?.walletAddress) {
      setPrivateKey(user.privateKey)
      setWalletAddress(user.walletAddress)
      fetchWalletData(user.walletAddress)
      // Pass user.uid to the listener
      setupTransactionsListener(user.uid)
    } else {
      setLoading(false)
      setTokensLoading(false)
      setBalance({ bnb: 0, bnbPrice: 0, totalUsd: 0 }) // Clear balance if no user
      setTokens([]) // Clear tokens if no user
      setTransactions([]) // Clear transactions if no user
    }
  }, [user, authLoading]) // Depend on user and authLoading

  const fetchWalletData = useCallback(
    async (address: string) => {
      setLoading(true)
      setTokensLoading(true)
      try {
        const bnbBal = await getBNBBalance(address)
        const currentBnbPrice = bnbPriceRef.current || (await getCachedBNBPrice())
        bnbPriceRef.current = currentBnbPrice // Ensure ref is updated

        // Fetch tokens from Firestore
        const tokensQuery = query(collection(db, "tokens"))
        const snapshot = await getDocs(tokensQuery)
        const fetchedTokens: Token[] = []

        for (const doc of snapshot.docs) {
          const tokenData = doc.data()
          const tokenContractAddress = tokenData.contractAddress
          const tokenDecimals = tokenData.decimals || 18 // Default to 18 if not set

          let tokenBalance = 0
          if (tokenContractAddress) {
            tokenBalance = await getTokenBalance(tokenContractAddress, address)
          }

          fetchedTokens.push({
            id: doc.id,
            name: tokenData.name,
            symbol: tokenData.symbol,
            contractAddress: tokenContractAddress,
            decimals: tokenDecimals,
            balance: tokenBalance,
            price: tokenData.price || 0, // Ensure price is fetched
            type: tokenData.type || "manual",
          })
        }

        const totalUsd =
          bnbBal * currentBnbPrice + fetchedTokens.reduce((sum, token) => sum + token.balance * token.price, 0)

        setBalance({
          bnb: bnbBal,
          bnbPrice: currentBnbPrice,
          totalUsd: totalUsd,
        })
        setTokens(fetchedTokens)
      } catch (error) {
        console.error("Error fetching wallet data:", error)
      } finally {
        setLoading(false)
        setTokensLoading(false)
      }
    },
    [], // No dependencies, as user.uid is handled by the outer useEffect
  )

  const refreshBalance = useCallback(async () => {
    if (walletAddress) {
      const bnbBal = await getBNBBalance(walletAddress)
      const currentBnbPrice = bnbPriceRef.current || (await getCachedBNBPrice())
      bnbPriceRef.current = currentBnbPrice // Ensure ref is updated

      const totalUsd = bnbBal * currentBnbPrice + tokens.reduce((sum, token) => sum + token.balance * token.price, 0)

      setBalance({
        bnb: bnbBal,
        bnbPrice: currentBnbPrice,
        totalUsd: totalUsd,
      })
    }
  }, [walletAddress, tokens])

  const refreshTokens = useCallback(async () => {
    if (walletAddress) {
      setTokensLoading(true)
      try {
        const tokensQuery = query(collection(db, "tokens"))
        const snapshot = await getDocs(tokensQuery)
        const fetchedTokens: Token[] = []

        for (const doc of snapshot.docs) {
          const tokenData = doc.data()
          const tokenContractAddress = tokenData.contractAddress
          const tokenDecimals = tokenData.decimals || 18

          let tokenBalance = 0
          if (tokenContractAddress) {
            tokenBalance = await getTokenBalance(tokenContractAddress, walletAddress)
          }

          fetchedTokens.push({
            id: doc.id,
            name: tokenData.name,
            symbol: tokenData.symbol,
            contractAddress: tokenContractAddress,
            decimals: tokenDecimals,
            balance: tokenBalance,
            price: tokenData.price || 0,
            type: tokenData.type || "manual",
          })
        }
        setTokens(fetchedTokens)
      } catch (error) {
        console.error("Error refreshing tokens:", error)
      } finally {
        setTokensLoading(false)
      }
    }
  }, [walletAddress])

  const setupTransactionsListener = useCallback(
    (userId: string) => {
      // Filter transactions by userId
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(50),
      )
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedTransactions: Transaction[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate(), // Convert Firestore Timestamp to Date
          })) as Transaction[]
          setTransactions(fetchedTransactions)
        },
        (error) => {
          console.error("Error listening to transactions:", error)
        },
      )
      return unsubscribe
    },
    [], // No dependencies, only runs once
  )

  const addTransaction = useCallback(
    async (newTransaction: Omit<Transaction, "userId" | "timestamp" | "id">) => {
      if (!user?.uid) return

      try {
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          timestamp: new Date(),
          ...newTransaction,
        })
      } catch (error) {
        console.error("Error adding transaction:", error)
      }
    },
    [user?.uid],
  )

  return {
    balance,
    tokens,
    transactions,
    loading,
    tokensLoading,
    walletAddress,
    privateKey,
    refreshBalance,
    refreshTokens,
    addTransaction,
  }
}
