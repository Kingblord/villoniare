"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function PinPage() {
  const [pin, setPin] = useState(["", "", "", ""])
  const [isCreating, setIsCreating] = useState(false)
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""])
  const [step, setStep] = useState<"check" | "create" | "confirm">("check")
  const [error, setError] = useState("")
  const router = useRouter()
  const { user, setPinVerified, pinVerified } = useAuth()

  useEffect(() => {
    if (!user) {
      router.push("/access")
      return
    }

    // If PIN is already verified, redirect to flash store
    if (pinVerified) {
      router.push("/flash-store")
      return
    }

    checkExistingPin()
  }, [user, pinVerified])

  const checkExistingPin = async () => {
    try {
      const existingPin = localStorage.getItem("userPin")
      if (existingPin) {
        setStep("check")
        setIsCreating(false)
      } else {
        setStep("create")
        setIsCreating(true)
      }
    } catch (error) {
      console.error("Error checking PIN:", error)
      setStep("create")
      setIsCreating(true)
    }
  }

  const handlePinInput = (index: number, value: string, isConfirm = false) => {
    if (value.length > 1) return

    const newPin = isConfirm ? [...confirmPin] : [...pin]
    newPin[index] = value

    if (isConfirm) {
      setConfirmPin(newPin)
    } else {
      setPin(newPin)
    }
  }

  const handleSubmit = async () => {
    const pinString = pin.join("")
    setError("")

    if (pinString.length !== 4) {
      setError("Please enter a 4-digit PIN")
      return
    }

    if (step === "create") {
      setStep("confirm")
      setConfirmPin(["", "", "", ""])
      return
    }

    if (step === "confirm") {
      const confirmPinString = confirmPin.join("")
      if (pinString !== confirmPinString) {
        setError("PINs do not match")
        setConfirmPin(["", "", "", ""])
        return
      }

      // Save PIN to localStorage
      localStorage.setItem("userPin", pinString)

      // Set PIN as verified in session
      sessionStorage.setItem("pinVerified", "true")
      setPinVerified(true)

      router.push("/flash-store")
      return
    }

    if (step === "check") {
      const storedPin = localStorage.getItem("userPin")
      if (pinString === storedPin) {
        // Set PIN as verified in session
        sessionStorage.setItem("pinVerified", "true")
        setPinVerified(true)
        router.push("/flash-store")
      } else {
        setError("Incorrect PIN")
        setPin(["", "", "", ""])
        // Focus first input
        document.getElementById("pin-0")?.focus()
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

  const getTitle = () => {
    switch (step) {
      case "create":
        return "Create Your PIN"
      case "confirm":
        return "Confirm Your PIN"
      default:
        return "Enter Your PIN"
    }
  }

  const getDescription = () => {
    switch (step) {
      case "create":
        return "Create a 4-digit PIN to secure your account"
      case "confirm":
        return "Please confirm your PIN"
      default:
        return "Enter your 4-digit PIN to continue"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">{getTitle()}</CardTitle>
          <CardDescription className="text-slate-400">{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center space-x-4">
            {(step === "confirm" ? confirmPin : pin).map((digit, index) => (
              <input
                key={index}
                id={step === "confirm" ? `confirm-pin-${index}` : `pin-${index}`}
                type="password"
                inputMode="none"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinInput(index, e.target.value, step === "confirm")}
                onKeyPress={handleKeyPress}
                className="w-12 h-12 text-center text-xl font-bold bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                autoFocus={index === 0}
                readOnly
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={pin.join("").length !== 4 && confirmPin.join("").length !== 4}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 rounded-xl transition-all duration-200"
          >
            {step === "create" ? "Continue" : step === "confirm" ? "Create PIN" : "Enter"}
          </Button>

          <div className="flex justify-center">
            <div className="grid grid-cols-3 gap-3 w-48">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((num, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className={`h-12 text-white hover:bg-slate-700 ${num === "" ? "invisible" : ""}`}
                  onClick={() => {
                    if (num === "⌫") {
                      const currentPin = step === "confirm" ? confirmPin : pin
                      const lastFilledIndex = currentPin.findLastIndex((digit) => digit !== "")
                      if (lastFilledIndex >= 0) {
                        handlePinInput(lastFilledIndex, "", step === "confirm")
                      }
                    } else if (num !== "") {
                      const currentPin = step === "confirm" ? confirmPin : pin
                      const nextEmptyIndex = currentPin.findIndex((digit) => digit === "")
                      if (nextEmptyIndex >= 0) {
                        handlePinInput(nextEmptyIndex, num.toString(), step === "confirm")
                      }
                    }
                  }}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
