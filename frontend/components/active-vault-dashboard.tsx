"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, LogOut } from "lucide-react"

interface ActiveVaultDashboardProps {
  vaultData: {
    nomineeAddress: string
    lockedAmount: number
    inactivityTimeout: string
  }
  onExitVault: () => void
}

const TIMEOUT_DAYS = {
  "3-months": 90,
  "6-months": 180,
  "1-year": 365,
  "5-years": 1825,
}

export default function ActiveVaultDashboard({ vaultData, onExitVault }: ActiveVaultDashboardProps) {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })
  const [pulseAnimating, setPulseAnimating] = useState(false)

  // Initialize countdown
  useEffect(() => {
    const totalDays = TIMEOUT_DAYS[vaultData.inactivityTimeout as keyof typeof TIMEOUT_DAYS]
    let remainingSeconds = totalDays * 24 * 60 * 60

    const timer = setInterval(() => {
      remainingSeconds = Math.max(0, remainingSeconds - 1)

      const days = Math.floor(remainingSeconds / (24 * 60 * 60))
      const hours = Math.floor((remainingSeconds % (24 * 60 * 60)) / (60 * 60))
      const minutes = Math.floor((remainingSeconds % (60 * 60)) / 60)
      const seconds = remainingSeconds % 60

      setTimeRemaining({ days, hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(timer)
  }, [vaultData.inactivityTimeout])

  const handlePulse = () => {
    setPulseAnimating(true)

    // Reset countdown to full time
    const totalDays = TIMEOUT_DAYS[vaultData.inactivityTimeout as keyof typeof TIMEOUT_DAYS]
    setTimeRemaining({
      days: totalDays,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })

    // Animate pulse button
    setTimeout(() => setPulseAnimating(false), 600)
  }

  const shortAddress = `${vaultData.nomineeAddress.slice(0, 6)}...${vaultData.nomineeAddress.slice(-4)}`

  return (
    <Card className="w-full max-w-lg border-border bg-card shadow-2xl">
      <CardHeader className="space-y-2 border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          Vault Status: ACTIVE
        </CardTitle>
        <CardDescription>Your Bitcoin is secured and monitored</CardDescription>
      </CardHeader>

      <CardContent className="space-y-8 pt-8">
        {/* Countdown Timer */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Time Remaining</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: timeRemaining.days, label: "Days" },
              { value: timeRemaining.hours, label: "Hours" },
              { value: timeRemaining.minutes, label: "Mins" },
              { value: timeRemaining.seconds, label: "Secs" },
            ].map((item, index) => (
              <div key={index} className="bg-input border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-mono font-bold text-primary">{String(item.value).padStart(2, "0")}</div>
                <div className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="space-y-3 border-y border-border py-6">
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Nominee</span>
            <span className="font-mono text-sm text-primary bg-input px-3 py-1 rounded">{shortAddress}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Locked Amount</span>
            <span className="font-mono text-lg font-bold text-foreground">{vaultData.lockedAmount} BTC</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">USD Value</span>
            <span className="font-mono text-sm text-accent">
              ≈ ${(vaultData.lockedAmount * 42500).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Pulse Button */}
        <Button
          onClick={handlePulse}
          disabled={pulseAnimating}
          className={`w-full h-12 font-semibold text-base transition-all duration-200 ${
            pulseAnimating
              ? "bg-primary text-primary-foreground scale-95"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <Heart className={`w-5 h-5 mr-2 ${pulseAnimating ? "fill-current" : ""}`} />
          {pulseAnimating ? "Pulse Sent..." : "I Am Alive"}
        </Button>

        {/* Exit Button */}
        <Button
          onClick={onExitVault}
          variant="outline"
          className="w-full border-border text-foreground hover:bg-input bg-transparent"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Exit Vault
        </Button>
      </CardContent>
    </Card>
  )
}
