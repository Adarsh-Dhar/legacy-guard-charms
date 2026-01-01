# Frontend-Contract Integration Guide

## Overview

This guide explains how the frontend connects to the legacy-guard contract and enables users to create, manage, and interact with inheritance vaults.

## Architecture

### Key Components

1. **Frontend Wallet Integration** (`hooks/useUnisat.ts`)
   - Connects to UniSat Bitcoin wallet
   - Retrieves user address and public key
   - Manages network switching to testnet

2. **Contract Configuration** (`lib/config.ts`)
   - Defines verification key: `c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337`
   - Timeout options in blocks (3-months to 5-years)
   - Bitcoin amount limits and dust thresholds

3. **Deployment Utilities** (`lib/deployment.ts`)
   - Public key formatting (32-byte hex validation)
   - BTC ↔ Satoshis conversion
   - Spell generation (Initialize, Pulse, Claim)
   - Configuration validation

4. **Contract Integration** (`lib/contract-integration.ts`)
   - High-level vault operations
   - Deployment bundle generation
   - Spell generation for contract actions
   - Wallet formatting for contract

## Environment Variables

When creating a vault, the frontend collects and generates:

```bash
export APP_VK="c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"
export OWNER_PUBKEY="<32-byte owner pubkey>"
export HEIR_PUBKEY="<32-byte heir pubkey>"
export HEIR_ADDRESS="<recipient address>"
export VAULT_VALUE="<amount in satoshis>"
export VAULT_AMOUNT_BTC="<amount in BTC>"
export TIMEOUT_BLOCKS="<blocks until heir can claim>"
export NETWORK="testnet|livenet|signet"
```

## User Flow

### 1. Connect Wallet
```typescript
import { useUnisat } from "@/hooks/useUnisat"

const { address, publicKey, isConnected } = useUnisat()
```

### 2. Create Vault
```typescript
import CreateVaultForm from "@/components/create-vault-form"

<CreateVaultForm 
  ownerAddress={address}
  ownerPubkey={publicKey}
  onCreateVault={handleCreateVault}
/>
```

### 3. Form Data Structure
The form collects:
- `nomineeAddress`: Heir's Bitcoin address (tb1p... for testnet)
- `nomineePubkey`: Heir's 32-byte public key (64 hex chars)
- `lockedAmount`: Amount in BTC
- `inactivityTimeout`: Timeout period (3-months, 6-months, 1-year, 5-years)

### 4. Generate Deployment
```typescript
import { generateDeploymentBundle } from "@/lib/contract-integration"

const bundle = generateDeploymentBundle(
  ownerPubkey,        // From wallet
  heirPubkey,         // From form
  heirAddress,        // From form
  amountBtc,          // From form
  timeoutKey,         // From form
  utxoId,            // From bitcoin-cli
  0,                 // UTXO index
  "testnet"          // Network
)
```

## Contract Spells

### Initialize Spell
Creates a new vault with owner and heir public keys:

```yaml
version: 1
inputs:
  - utxo: "txid:index"
    amount: <satoshis>
    charms:
      - app: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"
        data:
          action: Initialize
          owner_pubkey: "<32-byte hex>"
          heir_pubkey: "<32-byte hex>"
          timeout_blocks: <number>
```

### Pulse Spell
Owner sends heartbeat to reset timeout:

```yaml
version: 1
inputs:
  - utxo: "vault_utxo:0"
    charms:
      - app: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"
        data:
          action: Pulse
```

### Claim Spell
Heir claims vault after timeout:

```yaml
version: 1
inputs:
  - utxo: "vault_utxo:0"
    charms:
      - app: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"
        data:
          action: Claim
```

## Utility Functions

### Public Key Formatting
```typescript
import { formatPublicKey } from "@/lib/deployment"

const formatted = formatPublicKey("0102030405...")
// Returns: "0102030405...0f101112..." (64 hex chars, lowercase)
```

### Amount Conversion
```typescript
import { btcToSatoshis, satoshisToBtc } from "@/lib/deployment"

const satoshis = btcToSatoshis(1.5)    // 150_000_000
const btc = satoshisToBtc(150_000_000) // 1.5
```

### Configuration Validation
```typescript
import { validateVaultConfig } from "@/lib/deployment"

const { valid, errors } = validateVaultConfig(config)
if (!valid) {
  console.error(errors) // Array of validation errors
}
```

### Generate Spells
```typescript
import { generateInitializeSpell } from "@/lib/deployment"

const spell = generateInitializeSpell(config, "utxo_id", 0)
```

## Contract Integration Functions

### Create Vault Config
```typescript
import { createVaultConfig } from "@/lib/contract-integration"

const config = createVaultConfig(
  ownerPubkey,
  heirPubkey,
  heirAddress,
  1.5,           // BTC
  "1-year",      // Timeout key
  "testnet"
)
```

### Generate Deployment Bundle
```typescript
const bundle = generateDeploymentBundle(
  ownerPubkey,
  heirPubkey,
  heirAddress,
  1.5,
  "1-year",
  "txid",        // Optional UTXO
  0
)

if (bundle.success) {
  console.log(bundle.envVars)  // Environment variables
  console.log(bundle.report)   // Deployment report
  console.log(bundle.initSpell) // YAML spell
}
```

### Generate Spells for Actions
```typescript
import { generateSpellForAction } from "@/lib/contract-integration"

// Initialize
const initSpell = generateSpellForAction(
  "Initialize",
  "utxo_id",
  1.5,
  heirAddress,
  ownerPubkey,
  heirPubkey,
  52_000
)

// Pulse
const pulseSpell = generateSpellForAction(
  "Pulse",
  "vault_utxo",
  1.5,
  heirAddress
)

// Claim
const claimSpell = generateSpellForAction(
  "Claim",
  "vault_utxo",
  1.5,
  heirAddress
)
```

## Contract State

The contract stores:
```rust
pub struct VaultState {
    pub owner_pubkey: [u8; 32],      // 32-byte owner public key
    pub heir_pubkey: [u8; 32],       // 32-byte heir public key
    pub last_heartbeat: u64,         // Block height of last pulse
    pub timeout_blocks: u64,         // Blocks until heir can claim
}
```

## Validation Rules

1. **Public Keys**: Must be 64 hex characters (32 bytes)
2. **Addresses**: Must match Bitcoin address format (bc1/tb1/bcrt1/tc1...)
3. **Amounts**: Between 0.001 BTC and 21 BTC
4. **Timeout**: 26,000 to 520,000 blocks (~3 months to 5 years)
5. **Network**: testnet, livenet, or signet

## Error Handling

```typescript
import { validateAmount } from "@/lib/contract-integration"

const { valid, error } = validateAmount(1.5)
if (!valid) {
  console.error(error)
}
```

## Testing

### Mock Testing (Local)
```bash
cd contract/legacy-guard
export APP_VK=$(charms app vk)
cat ./spells/initialize.yaml | envsubst | charms spell check --app-bins=$(charms app build) --mock
```

### Deployment Report
```typescript
import { generateDeploymentReport } from "@/lib/deployment"

const report = generateDeploymentReport(config)
console.log(report)
```

## Next Steps

1. Get Bitcoin address from wallet
2. Provide heir's address and public key
3. Select amount and timeout
4. System generates deployment bundle
5. User signs and broadcasts transaction
6. Vault is initialized on Bitcoin

## References

- Contract: `contract/legacy-guard/src/contract.rs`
- Config: `frontend/lib/config.ts`
- Deployment: `frontend/lib/deployment.ts`
- Integration: `frontend/lib/contract-integration.ts`
- Wallet Hook: `frontend/hooks/useUnisat.ts`
- Form Component: `frontend/components/create-vault-form.tsx`
