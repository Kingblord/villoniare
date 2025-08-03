"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { generateWallet } from "@/lib/web3"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  loading: boolean
  pinVerified: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setPinVerified: (verified: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [pinVerified, setPinVerified] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user document to include wallet data
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            // Add wallet data to user object
            ;(user as any).walletAddress = userData.walletAddress
            ;(user as any).privateKey = userData.privateKey
          }
        } catch (error) {
          console.error("Error loading user data:", error)
        }
      }

      setUser(user)
      setLoading(false)

      // Check if PIN is verified when user changes
      if (user) {
        checkPinStatus()
      } else {
        setPinVerified(false)
      }
    })

    return unsubscribe
  }, [])

  const checkPinStatus = () => {
    const pinStatus = sessionStorage.getItem("pinVerified")
    setPinVerified(pinStatus === "true")
  }

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    // Don't redirect here, let the auth state change handle it
  }

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const newUser = userCredential.user

    // Generate wallet for new user
    const wallet = generateWallet()

    // Save user data to Firestore
    await setDoc(doc(db, "users", newUser.uid), {
      email: newUser.email,
      walletAddress: wallet.address,
      privateKey: wallet.privateKey,
      createdAt: new Date(),
      tokens: [],
    })

    // Update the user object to include wallet info
    ;(newUser as any).walletAddress = wallet.address
    ;(newUser as any).privateKey = wallet.privateKey

    // Don't redirect here, let the auth state change handle it
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    localStorage.removeItem("userPin")
    sessionStorage.removeItem("pinVerified")
    setPinVerified(false)
    router.push("/")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pinVerified,
        signIn,
        signUp,
        signOut,
        setPinVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
