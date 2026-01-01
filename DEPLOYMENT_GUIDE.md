# Legacy Guard Charms - Deployment Guide

## Overview

Legacy Guard is a **Dead Man's Switch** contract built on the Charms framework. It allows an owner to set up a vault that can be claimed by a designated heir if the owner doesn't send periodic heartbeat signals within a timeout period.

## Contract Architecture

### State: `VaultState`
```rust
pub struct VaultState {
    pub owner_pubkey: [u8; 32],      // Owner's public key
    pub heir_pubkey: [u8; 32],       // Heir's public key
    pub last_heartbeat: u64,         // Block height of last heartbeat
    pub timeout_blocks: u64,         // Timeout period in blocks (~1 year = 52,560)
}
```

### Actions
1. **Initialize**: Creates a new vault with specified owner, heir, and timeout
2. **Pulse**: Owner sends a heartbeat to reset the timer
3. **Claim**: Heir claims the vault after the timeout period has elapsed

## Building the Contract

The contract has been built and tested successfully. The WASM binary is located at:
```
./contract/legacy-guard/target/wasm32-wasip1/release/legacy-guard.wasm
```

### Build Command
```bash
cd contract/legacy-guard
charms app build
```

### Get Verification Key
```bash
cd contract/legacy-guard
export APP_VK=$(charms app vk)
echo $APP_VK
# Output: c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337
```

## Deploying to Bitcoin

### Prerequisites
1. **Bitcoin Node**: Running Bitcoin Core on testnet or signet
2. **Charms CLI**: Installed and configured
3. **Bitcoin Address**: A testnet/signet address with funds
4. **Wallet Setup**: Access to private keys for signing transactions

### Deployment Steps

#### 1. Initialize the Vault

Create an `initialize.yaml` spell:

```yaml
version: 1

inputs:
  - utxo: "${UTXO_ID}:${UTXO_INDEX}"
    amount: ${INPUT_AMOUNT}

outputs:
  - address: "${VAULT_ADDRESS}"
    value: ${VAULT_VALUE}
    charms:
      - app: "${APP_VK}"
        data:
          action: Initialize
          owner_pubkey: ${OWNER_PUBKEY}
          heir_pubkey: ${HEIR_PUBKEY}
          timeout_blocks: 52560
```

**Environment Variables**:
- `UTXO_ID`: UTXO ID you're spending (from `bitcoin-cli listunspent`)
- `UTXO_INDEX`: Output index (usually 0)
- `INPUT_AMOUNT`: Amount in satoshis
- `VAULT_ADDRESS`: Address where vault UTXO will be held
- `VAULT_VALUE`: Amount locked in vault (satoshis)
- `OWNER_PUBKEY`: Owner's 32-byte public key
- `HEIR_PUBKEY`: Heir's 32-byte public key
- `APP_VK`: Application verification key

#### 2. Create a Vault Transaction

```bash
cd contract/legacy-guard

# Set environment variables
export APP_VK=$(charms app vk)
export OWNER_PUBKEY="0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
export HEIR_PUBKEY="201f1e1d1c1b1a19181716151413121110080706050403020100"
export VAULT_ADDRESS="tb1p..." # Your testnet address
export VAULT_VALUE="10000" # satoshis
export UTXO_ID="..." # From listunspent
export INPUT_AMOUNT="20000"

# Validate the spell
cat ./spells/pulse.yaml | envsubst | charms spell check --app-bins=$(charms app build) --mock

# For actual deployment on testnet/signet:
# 1. Create the transaction (requires signing)
# 2. Broadcast to the network
```

#### 3. Perform a Heartbeat (Pulse)

Once the vault is initialized, the owner can send heartbeats:

```yaml
version: 1

inputs:
  - utxo: "${VAULT_UTXO}:0"
    charms:
      - app: "${APP_VK}"

outputs:
  - address: "${VAULT_ADDRESS}"
    value: ${VAULT_VALUE}
    charms:
      - app: "${APP_VK}"
        data:
          action: Pulse
```

#### 4. Claim the Vault (Heir)

After the timeout expires, the heir can claim:

```yaml
version: 1

inputs:
  - utxo: "${VAULT_UTXO}:0"
    charms:
      - app: "${APP_VK}"

outputs:
  - address: "${HEIR_ADDRESS}"
    value: ${VAULT_VALUE}
```

## Testing

### Mock Testing (Local)

Test spells without broadcasting to Bitcoin:

```bash
cd contract/legacy-guard

# Test Initialize spell
export APP_VK=$(charms app vk)
cat ./spells/pulse.yaml | envsubst | charms spell check --app-bins=$(charms app build) --mock

# Test Pulse spell
cat ./spells/pulse.yaml | envsubst | charms spell check --app-bins=$(charms app build) --mock

# Test Claim spell
cat ./spells/claim.yaml | envsubst | charms spell check --app-bins=$(charms app build) --mock
```

### Testnet Deployment

For deployment on Bitcoin testnet:

```bash
# 1. Ensure you have testnet Bitcoin address with funds
# 2. Get a UTXO
bitcoin-cli listunspent 0 | jq '.[] | select(.amount > 0.0001)'

# 3. Export environment variables with your values

# 4. Create and sign the transaction

# 5. Broadcast to testnet
```

## Verification

### Verify Contract Built Successfully
```bash
ls -lh contract/legacy-guard/target/wasm32-wasip1/release/legacy-guard.wasm
```

### Verify Verification Key
```bash
cd contract/legacy-guard
charms app vk
# Should output: c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337
```

### Verify Spell Validity
```bash
charms spell check --app-bins=$(charms app build) --mock < spell.yaml
```

## Important Notes

1. **Timeout Calculation**: 
   - 1 year ≈ 52,560 blocks (Bitcoin ~10 minutes per block)
   - Adjust `timeout_blocks` based on your requirements

2. **Key Management**:
   - Store owner and heir private keys securely
   - Use proper wallet software for key generation and signing

3. **Testing**:
   - Always test on testnet/signet before mainnet
   - Use `--mock` flag for local validation

4. **Transactions**:
   - Owner must sign Pulse transactions
   - Heir must sign Claim transactions
   - Proper fee calculation is required

## Troubleshooting

### Compilation Errors
```bash
# Ensure WASM target is installed
rustup target add wasm32-wasip1

# Rebuild
cd contract/legacy-guard
cargo clean
charms app build
```

### Spell Check Failures
- Verify all environment variables are set
- Check public key format (should be 32 bytes, hex-encoded)
- Ensure UTXO IDs are valid and unspent

### Transaction Broadcasting Issues
- Verify Bitcoin node is synced
- Check fee rates are adequate
- Ensure inputs are confirmed UTXOs

## Summary

The Legacy Guard contract has been successfully built and is ready for deployment. The implementation includes:

✅ Contract compilation without errors
✅ WASM binary generation
✅ Verification key: `c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337`
✅ Three spell templates for Initialize, Pulse, and Claim actions
✅ Proper state management and cryptographic validation

To deploy, follow the steps above with your specific Bitcoin testnet/signet configuration.
