"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Lock } from "lucide-react"
import { LEGACY_GUARD_CONFIG } from "@/lib/config"
import { btcToSatoshis, formatPublicKey } from "@/lib/deployment"

interface CreateVaultFormProps {
  ownerPubkey?: string
  ownerAddress?: string
  onCreateVault: (data: any) => void
}

export default function CreateVaultForm({ ownerPubkey, ownerAddress, onCreateVault }: CreateVaultFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nomineeAddress: "",
    lockedAmount: "",
    inactivityTimeout: "",
    nomineePubkey: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate proof generation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setLoading(false)
    
    // Format the vault deployment data
    const timeoutBlocks = LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS[
      formData.inactivityTimeout as keyof typeof LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS
    ] || 52_000

    const vaultData = {
      nomineeAddress: formData.nomineeAddress,
      lockedAmount: Number.parseFloat(formData.lockedAmount),
      lockedAmountSatoshis: btcToSatoshis(Number.parseFloat(formData.lockedAmount)),
      inactivityTimeout: formData.inactivityTimeout,
      inactivityTimeoutBlocks: timeoutBlocks,
      nomineePubkey: formatPublicKey(formData.nomineePubkey),
      ownerAddress,
      ownerPubkey: ownerPubkey ? formatPublicKey(ownerPubkey) : undefined,
      appVerificationKey: LEGACY_GUARD_CONFIG.VERIFICATION_KEY,
    }
    
    onCreateVault(vaultData)
  }

  const usdValue = formData.lockedAmount ? (Number.parseFloat(formData.lockedAmount) * 42500).toFixed(2) : "0.00"
  const selectedTimeout = formData.inactivityTimeout
    ? LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS[formData.inactivityTimeout as keyof typeof LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS]
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
          {/* Owner Address Display */}
          {ownerAddress && (
            <div className="space-y-2 p-3 bg-input/50 rounded-md border border-border/50">
              <Label className="text-xs text-muted-foreground font-semibold uppercase">Owner Address</Label>
              <p className="text-xs font-mono text-foreground/80 break-all">{ownerAddress}</p>
            </div>
          )}

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

          {/* Nominee Public Key Field */}
          <div className="space-y-2">
            <Label htmlFor="nomineePubkey" className="text-foreground font-medium">
              Nominee Public Key (Hex)
            </Label>
            <Input
              id="nomineePubkey"
              placeholder="0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
              value={formData.nomineePubkey}
              onChange={(e) => setFormData({ ...formData, nomineePubkey: e.target.value })}
              className="font-mono text-xs bg-input border-border text-foreground"
              required
            />
            <p className="text-xs text-muted-foreground">32-byte public key (64 hex characters)</p>
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
                {Object.entries(LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS).map(([key, blocks]) => (
                  <SelectItem key={key} value={key} className="text-foreground">
                    {key.replace("-", " ").toUpperCase()} ({blocks.toLocaleString()} blocks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTimeout && <p className="text-xs text-primary">≈ {selectedTimeout.toLocaleString()} blocks</p>}
          </div>

          {/* Amount to Lock Field */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground font-medium">
              Amount to Lock (BTC)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="1.5"
              step="0.001"
              min={LEGACY_GUARD_CONFIG.MIN_AMOUNT}
              max={LEGACY_GUARD_CONFIG.MAX_AMOUNT}
              value={formData.lockedAmount}
              onChange={(e) => setFormData({ ...formData, lockedAmount: e.target.value })}
              className="font-mono text-sm bg-input border-border text-foreground"
              required
            />
            <p className="text-xs text-muted-foreground">
              ≈ ${usdValue} USD • {formData.lockedAmount ? btcToSatoshis(Number.parseFloat(formData.lockedAmount)).toLocaleString() : "0"} satoshis
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !formData.nomineeAddress || !formData.lockedAmount || !formData.inactivityTimeout || !formData.nomineePubkey}
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
