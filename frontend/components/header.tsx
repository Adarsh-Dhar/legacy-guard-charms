"use client"

import { Shield } from "lucide-react"
import ConnectWallet from "@/components/ConnectWallet"

export default function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-foreground">LegacyGuard</span>
        </div>

        <ConnectWallet />
      </div>
    </header>
  )
}
