"use client"

import { Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  walletConnected: boolean
  setWalletConnected: (connected: boolean) => void
}

export default function Header({ walletConnected, setWalletConnected }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-foreground">LegacyGuard</span>
        </div>

        <Button
          onClick={() => setWalletConnected(!walletConnected)}
          variant={walletConnected ? "outline" : "default"}
          className={walletConnected ? "bg-transparent border-primary text-primary hover:bg-primary/10" : ""}
        >
          {walletConnected ? "✓ Wallet Connected" : "Connect Wallet"}
        </Button>
      </div>
    </header>
  )
}
