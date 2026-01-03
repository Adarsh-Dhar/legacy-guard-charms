"use client"

import type React from "react"

import { useState } from "react"
import { LEGACY_GUARD_CONFIG } from "@/lib/config"
import { btcToSatoshis, formatPublicKey } from "@/lib/deployment"
import { generateDeploymentBundle } from "@/lib/contract-integration"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle, CheckCircle } from "lucide-react"

interface CreateVaultFormProps {
  ownerPubkey?: string
  ownerAddress?: string
  onCreateVault: (data: any) => void
}

async function derivePublicKeyFromAddress(address: string): Promise<string | null> {
  try {
    // Call our backend API to avoid CORS issues
    const response = await fetch("/api/derive-pubkey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to derive public key")
    }

    const data = await response.json()
    return data.publicKey || null
  } catch (error) {
    console.error("Error deriving public key:", error)
    throw error
  }
}

export default function CreateVaultForm({ ownerPubkey, ownerAddress, onCreateVault }: CreateVaultFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    lockedAmount: "",
    inactivityTimeout: "",
    nomineeAddress: "",
  })
  const [derivingPubkey, setDerivingPubkey] = useState(false)
  const [derivedPubkey, setDerivedPubkey] = useState<string | null>(null)

  const normalizePubkey = (raw: string): string => {
    if (!raw) throw new Error("Public key missing")
    let key = raw.toLowerCase().trim()
    if (key.startsWith("0x")) key = key.slice(2)
    // Compressed (02/03 + 32 bytes) -> drop prefix
    if ((key.startsWith("02") || key.startsWith("03")) && key.length === 66) {
      key = key.slice(2)
    }
    // Uncompressed (04 + 64 bytes for x + 64 bytes for y) -> take x coordinate
    if (key.startsWith("04") && key.length === 130) {
      key = key.slice(2, 66)
    }
    if (key.length !== 64 || !/^[0-9a-f]{64}$/.test(key)) {
      throw new Error(`Invalid public key format. Got ${key.length} chars. Expected 64 hex characters.`)
    }
    return key
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      // Validate wallet connection
      if (!window.unisat) {
        throw new Error("UniSat wallet not found. Please install UniSat extension.")
      }

      // Fetch owner's public key from wallet if not provided
      let ownerPublicKey = ownerPubkey
      if (!ownerPublicKey) {
        console.log("Fetching owner public key from wallet...")
        ownerPublicKey = await window.unisat.getPublicKey()
        console.log("Raw public key from wallet:", ownerPublicKey, "length:", ownerPublicKey?.length)
      }

      if (!ownerPublicKey) {
        throw new Error("Failed to get public key from wallet. Make sure UniSat is connected and unlocked.")
      }

      ownerPublicKey = normalizePubkey(ownerPublicKey)

      if (!ownerAddress) {
        throw new Error("Wallet not connected. Please connect your wallet first.")
      }

      console.log("Owner public key:", ownerPublicKey)

      // Get heir's address and derive public key
      const heirAddress = formData.nomineeAddress.trim()
      if (!heirAddress) {
        throw new Error("Please enter heir's Bitcoin address.")
      }

      let cleanedHeirPubkey = derivedPubkey

      if (!cleanedHeirPubkey) {
        // Try to derive from address if not already derived
        console.log("Deriving public key from address...")
        const derived = await derivePublicKeyFromAddress(heirAddress)
        if (!derived) {
          throw new Error(
            "Could not derive public key from address. Make sure the address has sent funds at least once on the blockchain. " +
            "Alternatively, ask your heir to export their public key directly from their wallet."
          )
        }
        cleanedHeirPubkey = derived
      }

      cleanedHeirPubkey = normalizePubkey(cleanedHeirPubkey)
      setDerivedPubkey(cleanedHeirPubkey)

      const amount = Number.parseFloat(formData.lockedAmount)
      if (!amount || amount < LEGACY_GUARD_CONFIG.MIN_AMOUNT) {
        throw new Error(`Amount must be at least ${LEGACY_GUARD_CONFIG.MIN_AMOUNT} BTC.`)
      }

      if (!formData.inactivityTimeout) {
        throw new Error("Please select an inactivity timeout.")
      }

      console.log("Creating vault...")

      // Generate the deployment bundle with spell
      const bundle = generateDeploymentBundle(
        ownerPublicKey,
        cleanedHeirPubkey,
        heirAddress,
        amount,
        formData.inactivityTimeout,
        undefined,
        0,
        "testnet"
      )

      const spell = (bundle as any).spell || bundle.initSpell
      if (!bundle.success || !spell) {
        throw new Error("Failed to generate vault spell. " + (bundle.errors?.join(", ") || ""))
      }

      // Convert amount to satoshis
      const satoshis = btcToSatoshis(amount)

      console.log("Requesting transaction signature from wallet...")
      console.log("Spell template:", spell)

      // Check wallet balance and UTXOs
      const balance = await window.unisat.getBalance()
      console.log("Current balance:", balance)
      
      // Try to get UTXOs from wallet
      let utxos = []
      try {
        // Some UniSat versions expose getBitcoinUtxos
        if (typeof window.unisat.getBitcoinUtxos === 'function') {
          utxos = await window.unisat.getBitcoinUtxos()
          console.log("Available UTXOs:", utxos)
          console.log("UTXO details:", utxos.map((u: any) => ({
            txid: u.txid,
            vout: u.vout,
            value: u.satoshis,
            confirmed: u.height > 0
          })))
        }
      } catch (utxoError) {
        console.warn("Could not fetch UTXOs:", utxoError)
      }
      
      // Warn if UTXOs might be stale
      if (utxos.length > 0) {
        const unconfirmedUtxos = utxos.filter((u: any) => !u.height || u.height === -1)
        if (unconfirmedUtxos.length > 0) {
          console.warn(`Warning: ${unconfirmedUtxos.length} of ${utxos.length} UTXOs are unconfirmed`)
        }
      }
      
      // Check if we have usable UTXOs
      if (balance.confirmed === 0) {
        throw new Error(
          "No confirmed balance available. Please wait for your transactions to confirm before creating a vault. " +
          "If you just received funds, they need at least 1 confirmation."
        )
      }
      
      if (utxos.length === 0 && balance.confirmed > 0) {
        console.warn("No UTXOs available but balance shows confirmed funds - wallet might be syncing")
      }
      
      // Estimate fee (2 sat/vbyte * ~200 vbytes = ~400 sats minimum)
      const estimatedFee = 600 // Conservative estimate in satoshis
      if (balance.confirmed < satoshis + estimatedFee) {
        throw new Error(
          `Insufficient confirmed balance. You need at least ${(satoshis + estimatedFee) / 100000000} BTC, ` +
          `but you have ${balance.confirmed / 100000000} BTC confirmed ` +
          `(${balance.unconfirmed / 100000000} BTC unconfirmed). ` +
          `Please wait for confirmations or add more funds.`
        )
      }

      // Sign and send transaction with UniSat (UTXO selection is handled automatically)
      console.log("Signing transaction...")
      console.log("Sending", satoshis, "sats to", heirAddress)
      let signedTx
      
      try {
        signedTx = await window.unisat.sendBitcoin(
          heirAddress,
          satoshis,
          {
            feeRate: 2, // Increase fee rate to 2 sat/vbyte for better propagation
          }
        )
      } catch (walletError: any) {
        console.error("UniSat wallet error:", walletError)
        console.error("Error type:", typeof walletError)
        console.error("Error stringified:", JSON.stringify(walletError, null, 2))
        
        // Extract error details
        const errorCode = walletError?.code
        const errorMessage = walletError?.message || walletError?.error || String(walletError)
        const errorData = walletError?.data
        
        console.error("Parsed error:", { errorCode, errorMessage, errorData })
        
        // Handle empty error (user cancelled)
        if (!errorCode && !errorMessage && Object.keys(walletError || {}).length === 0) {
          throw new Error('Transaction was cancelled or rejected by wallet.')
        }
        
        if (errorCode === -32603 || errorMessage.includes('bad-txns-inputs-missingorspent')) {
          throw new Error(
            'UTXO Error: Your wallet UTXOs are stale or already spent. ' +
            'This happens when previous transactions are still pending or the wallet cache is outdated. ' +
            '\n\nSolutions:\n' +
            '1. Wait 10-15 minutes for pending transactions to confirm\n' +
            '2. Get fresh testnet coins from: https://testnet-faucet.mempool.co/\n' +
            '3. Close and restart UniSat wallet to refresh UTXO state'
          )
        }
        
        if (errorMessage.includes('Insufficient') || errorMessage.includes('balance')) {
          throw new Error(
            `Insufficient balance for transaction. You need ${(satoshis + 600) / 100000000} BTC but may not have enough available UTXOs.`
          )
        }
        
        throw new Error(
          `Wallet transaction failed${errorCode ? ` (${errorCode})` : ''}: ${errorMessage || 'Unknown error'}. ` +
          `Note: Standard UniSat doesn't support Charms protocol. ` +
          `For production, use BitcoinOS SDK or Charms-compatible wallet.`
        )
      }

      if (!signedTx) {
        throw new Error("Transaction signing cancelled by user.")
      }

      console.log("Transaction signed:", signedTx)
      setTxId(signedTx)

      // Prepare vault data with actual transaction
      const timeoutBlocks = LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS[
        formData.inactivityTimeout as keyof typeof LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS
      ] || 52_000

      const vaultData = {
        lockedAmount: amount,
        lockedAmountSatoshis: satoshis,
        inactivityTimeout: formData.inactivityTimeout,
        inactivityTimeoutBlocks: timeoutBlocks,
        nomineeAddress: heirAddress,
        ownerAddress,
        ownerPubkey: formatPublicKey(ownerPublicKey),
        appVerificationKey: LEGACY_GUARD_CONFIG.VERIFICATION_KEY,
        txId: signedTx,
        spell,
        timestamp: new Date().toISOString(),
      }

      console.log("Vault created successfully:", vaultData)

      // Store vault in database
      try {
        const saveResponse = await fetch("/api/vaults", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vaultData),
        })

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json()
          console.warn("Failed to save vault to database:", errorData)
          // Don't fail the entire operation if DB save fails
        } else {
          const savedVault = await saveResponse.json()
          console.log("Vault saved to database:", savedVault)
        }
      } catch (dbError) {
        console.warn("Error saving vault to database:", dbError)
        // Don't fail the entire operation if DB save fails
      }

      setSuccess(true)
      onCreateVault(vaultData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err)
      console.error("Vault creation error:", err)
      console.error("Error details:", { 
        message: errorMessage, 
        type: err instanceof Error ? err.constructor.name : typeof err,
        stack: err instanceof Error ? err.stack : undefined
      })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
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
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && txId && (
            <Alert className="bg-green-500/10 border-green-500/50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Vault created! Transaction: <span className="font-mono text-xs">{txId}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Owner Address Display */}
          {ownerAddress && (
            <div className="space-y-2 p-3 bg-input/50 rounded-md border border-border/50">
              <Label className="text-xs text-muted-foreground font-semibold uppercase">Owner Address</Label>
              <p className="text-xs font-mono text-foreground/80 break-all">{ownerAddress}</p>
            </div>
          )}

          {/* Nominee Address Field */}
          <div className="space-y-2">
            <Label htmlFor="nomineeAddress" className="text-foreground font-medium">
              Nominee Bitcoin Address
            </Label>
            <div className="flex gap-2">
              <Input
                id="nomineeAddress"
                placeholder="bc1q... or tb1q..."
                value={formData.nomineeAddress}
                onChange={(e) => {
                  setFormData({ ...formData, nomineeAddress: e.target.value })
                  setDerivedPubkey(null) // Clear derived pubkey when address changes
                }}
                className="font-mono text-sm bg-input border-border text-foreground"
                required
              />
              <Button
                type="button"
                onClick={async () => {
                  if (!formData.nomineeAddress.trim()) {
                    setError("Please enter an address first")
                    return
                  }
                  setDerivingPubkey(true)
                  setError(null)
                  try {
                    const pubkey = await derivePublicKeyFromAddress(formData.nomineeAddress.trim())
                    if (pubkey) {
                      setDerivedPubkey(pubkey)
                    } else {
                      setError("Could not derive public key from this address. It may not have sent funds yet.")
                    }
                  } catch (err) {
                    setError("Error deriving public key: " + (err instanceof Error ? err.message : "Unknown error"))
                  } finally {
                    setDerivingPubkey(false)
                  }
                }}
                disabled={derivingPubkey || !formData.nomineeAddress.trim()}
                variant="outline"
                className="whitespace-nowrap"
              >
                {derivingPubkey ? "Deriving..." : "Derive Key"}
              </Button>
            </div>
            {derivedPubkey && (
              <p className="text-xs text-green-600 font-mono break-all">
                ✓ Public key derived: {derivedPubkey.slice(0, 16)}...
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter the address and click "Derive Key" to extract the public key from blockchain data. Address must have sent funds at least once.
            </p>
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
              step="0.00001"
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
            disabled={loading || success || !formData.lockedAmount || !formData.inactivityTimeout || !formData.nomineeAddress || !derivedPubkey}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base h-10 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                {txId ? "Broadcasting Transaction..." : "Signing with Wallet..."}
              </span>
            ) : success ? (
              "✓ Vault Created"
            ) : (
              "Enchant UTXO & Lock Funds"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
