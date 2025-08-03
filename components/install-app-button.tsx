"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Smartphone, X, AlertCircle } from "lucide-react"
import { usePWA } from "@/lib/pwa-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function InstallAppButton() {
  const { isStandalone, isInstallable, installApp, installPrompt } = usePWA()
  const [showInstructions, setShowInstructions] = useState(false)
  const [installing, setInstalling] = useState(false)

  // Don't show if already installed as PWA
  if (isStandalone) return null

  const handleInstall = async () => {
    if (isInstallable && installPrompt) {
      setInstalling(true)
      try {
        await installApp()
        // Installation successful - button will disappear due to isStandalone change
      } catch (error) {
        console.error("Installation failed:", error)
        // Show manual instructions as fallback
        setShowInstructions(true)
      } finally {
        setInstalling(false)
      }
    } else {
      // Show manual instructions if no native prompt available
      setShowInstructions(true)
    }
  }

  const getInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isChrome = /Chrome/.test(navigator.userAgent)

    if (isIOS && isSafari) {
      return {
        title: "Install on iPhone/iPad",
        subtitle: "Add to Home Screen for full app experience",
        steps: [
          "Tap the Share button (square with arrow) at the bottom",
          "Scroll down and tap 'Add to Home Screen'",
          "Tap 'Add' to install the app",
          "Open VillonairesWorld from your home screen",
        ],
        note: "The app will run in full-screen mode like a native app",
      }
    } else if (isAndroid && isChrome) {
      return {
        title: "Install on Android",
        subtitle: "Install as native app",
        steps: [
          "Tap the menu (⋮) in Chrome",
          "Select 'Add to Home screen' or 'Install app'",
          "Tap 'Install' in the popup",
          "Open VillonairesWorld from your app drawer",
        ],
        note: "The app will appear in your app drawer like other apps",
      }
    } else {
      return {
        title: "Install on Desktop",
        subtitle: "Install as desktop application",
        steps: [
          "Look for the install icon (⊕) in your address bar",
          "Click 'Install VillonairesWorld'",
          "The app will be added to your desktop/start menu",
          "Launch it like any other desktop application",
        ],
        note: "The app will run in its own window without browser UI",
      }
    }
  }

  return (
    <>
      <Button
        onClick={handleInstall}
        disabled={installing}
        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
      >
        <Smartphone className="w-5 h-5" />
        <span>{installing ? "Installing..." : isInstallable ? "Install App" : "Get App"}</span>
        <Download className="w-4 h-4" />
      </Button>

      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-white flex items-center">
                    <Smartphone className="w-5 h-5 mr-2" />
                    {getInstallInstructions().title}
                  </CardTitle>
                  <p className="text-sm text-slate-400 mt-1">{getInstallInstructions().subtitle}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInstructions(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {getInstallInstructions().steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-slate-300 text-sm">{step}</p>
                  </div>
                ))}
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-400 text-sm font-medium">Native App Experience</p>
                    <p className="text-green-300 text-xs mt-1">{getInstallInstructions().note}</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-amber-400 text-sm">
                  <strong>Benefits:</strong> Faster loading, offline support, push notifications, and full-screen
                  experience!
                </p>
              </div>

              <Button
                onClick={() => setShowInstructions(false)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl"
              >
                Got it!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
