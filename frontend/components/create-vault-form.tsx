"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Lock } from "lucide-react"

interface CreateVaultFormProps {
  onCreateVault: (data: any) => void
}

const TIMEOUT_OPTIONS = {
  "3-months": { label: "3 Months", blocks: "26,000" },
  "6-months": { label: "6 Months", blocks: "52,000" },
  "1-year": { label: "1 Year", blocks: "104,000" },
  "5-years": { label: "5 Years", blocks: "520,000" },
}

export default function CreateVaultForm({ onCreateVault }: CreateVaultFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nomineeAddress: "",
    lockedAmount: "",
    inactivityTimeout: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate proof generation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setLoading(false)
    onCreateVault({
      nomineeAddress: formData.nomineeAddress,
      lockedAmount: Number.parseFloat(formData.lockedAmount),
      inactivityTimeout: formData.inactivityTimeout,
    })
  }

  const usdValue = formData.lockedAmount ? (Number.parseFloat(formData.lockedAmount) * 42500).toFixed(2) : "0.00"
  const selectedTimeout = formData.inactivityTimeout
    ? TIMEOUT_OPTIONS[formData.inactivityTimeout as keyof typeof TIMEOUT_OPTIONS]
    : null

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-2xl">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <CardTitle className="text-text-balance">Secure Your Legacy</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Lock Bitcoin and set up automatic inheritance transfers
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nominee Address Field */}
          <div className="space-y-2">
            <Label htmlFor="nominee" className="text-foreground font-medium">
              Nominee Address
            </Label>
            <Input
              id="nominee"
              placeholder="bc1q..."
              value={formData.nomineeAddress}
              onChange={(e) => setFormData({ ...formData, nomineeAddress: e.target.value })}
              className="font-mono text-sm bg-input border-border text-foreground"
              required
            />
            <p className="text-xs text-muted-foreground">The wallet that will receive funds if you are inactive.</p>
          </div>

          {/* Inactivity Timeout Field */}
          <div className="space-y-2">
            <Label htmlFor="timeout" className="text-foreground font-medium">
              Inactivity Timeout
            </Label>
            <Select
              value={formData.inactivityTimeout}
              onValueChange={(value) => setFormData({ ...formData, inactivityTimeout: value })}
            >
              <SelectTrigger id="timeout" className="bg-input border-border text-foreground">
                <SelectValue placeholder="Select timeout period" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {Object.entries(TIMEOUT_OPTIONS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key} className="text-foreground">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTimeout && <p className="text-xs text-primary">approx. {selectedTimeout.blocks} blocks</p>}
          </div>

          {/* Amount to Lock Field */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground font-medium">
              Amount to Lock
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="1.5"
              step="0.01"
              min="0"
              value={formData.lockedAmount}
              onChange={(e) => setFormData({ ...formData, lockedAmount: e.target.value })}
              className="font-mono text-sm bg-input border-border text-foreground"
              required
            />
            <p className="text-xs text-muted-foreground">≈ ${usdValue} USD</p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !formData.nomineeAddress || !formData.lockedAmount || !formData.inactivityTimeout}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base h-10 transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                Generating Zero-Knowledge Proof...
              </span>
            ) : (
              "Enchant UTXO & Lock Funds"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
