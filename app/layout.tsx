import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { PWAProvider } from "@/lib/pwa-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VillonairesWorld - Flash Trading Revolution",
  description: "Experience instant token generation and seamless wallet management in the next generation of DeFi",
  manifest: "/manifest.json",
  themeColor: "#f59e0b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VillonairesWorld",
    startupImage: "/images/villonaires-logo.png",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "VillonairesWorld",
    "application-name": "VillonairesWorld",
    "msapplication-TileColor": "#0f172a",
    "msapplication-tap-highlight": "no",
    "msapplication-navbutton-color": "#f59e0b",
    "msapplication-starturl": "/",
  },
    generator: 'v0.dev'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f59e0b",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="VillonairesWorld" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VillonairesWorld" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-navbutton-color" content="#f59e0b" />
        <meta name="msapplication-starturl" content="/" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/images/villonaires-logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/villonaires-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/villonaires-logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/images/villonaires-logo.png" />

        {/* Splash Screens for iOS */}
        <link
          rel="apple-touch-startup-image"
          href="/images/villonaires-logo.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/villonaires-logo.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />

        {/* Standard Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/images/villonaires-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/villonaires-logo.png" />
        <link rel="shortcut icon" href="/images/villonaires-logo.png" />

        {/* Microsoft Tiles */}
        <meta name="msapplication-TileImage" content="/images/villonaires-logo.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={`${inter.className} select-none touch-manipulation`}>
        <PWAProvider>
          <AuthProvider>{children}</AuthProvider>
        </PWAProvider>
      </body>
    </html>
  )
}
