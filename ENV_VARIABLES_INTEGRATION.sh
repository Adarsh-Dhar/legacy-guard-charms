#!/bin/bash
# Legacy Guard Vault Deployment - Environment Variables Example
# Generated from Frontend Integration

# ============================================================
# Contract Configuration
# ============================================================

# Application Verification Key (from: charms app vk)
export APP_VK="c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"

# Owner's public key (connected from wallet via UniSat)
# Format: 32 bytes in hexadecimal (64 characters)
export OWNER_PUBKEY=\"0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20\"

# Heir's public key (provided by user in frontend form)
# Format: 32 bytes in hexadecimal (64 characters)
export HEIR_PUBKEY=\"201f1e1d1c1b1a19181716151413121110080706050403020100\"

# Heir's Bitcoin address (provided by user in frontend form)
# Format: Testnet address (tb1p...) or Mainnet address (bc1p...)
export HEIR_ADDRESS=\"tb1pxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\"

# Vault amount in satoshis
# Example: 1.5 BTC = 150,000,000 satoshis
export VAULT_VALUE=\"150000000\"

# Vault amount in BTC (for reference)
export VAULT_AMOUNT_BTC=\"1.5\"

# Timeout period in blocks
# Options from frontend:
# - 3-months: 26,000 blocks
# - 6-months: 52,000 blocks  
# - 1-year:   104,000 blocks
# - 5-years:  520,000 blocks
export TIMEOUT_BLOCKS=\"52000\"

# Bitcoin network
# Options: testnet, livenet, signet
export NETWORK=\"testnet\"

# ============================================================
# Transaction-specific variables (set from bitcoin-cli)
# ============================================================

# UTXO ID (from bitcoin-cli listunspent)
# Format: txid:index
export UTXO_ID=\"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx:0\"

# UTXO Index (usually 0)
export UTXO_INDEX=\"0\"

# Total input amount in satoshis
# Must be >= VAULT_VALUE (includes transaction fees)
export INPUT_AMOUNT=\"160000000\"

# Change address (optional, for fee adjustment)
export CHANGE_ADDRESS=\"tb1pxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\"

# ============================================================
# Frontend Integration Data
# ============================================================

# Owner's Bitcoin address (from wallet connection)
export OWNER_ADDRESS=\"tb1pxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\"

# Network configuration
export BITCOIN_TESTNET_NAME=\"Bitcoin Testnet\"
export CHARMS_VERSION=\"alpha-v1\"

# ============================================================
# How to Use
# ============================================================

# 1. Connect wallet in frontend to get:
#    - OWNER_ADDRESS (from UniSat wallet)
#    - OWNER_PUBKEY (from UniSat wallet)
#    - NETWORK (auto-detected from wallet)

# 2. Create vault form collects:
#    - HEIR_ADDRESS (user input)
#    - HEIR_PUBKEY (user input, 32-byte hex)
#    - VAULT_AMOUNT_BTC (user input)
#    - TIMEOUT_BLOCKS (user selection)

# 3. Frontend generates deployment bundle with:
#    - All above variables
#    - Validation of all parameters
#    - Initialize spell YAML
#    - Deployment report

# 4. Get UTXO from Bitcoin:
#    bitcoin-cli listunspent 0 | jq '.[] | select(.amount > 0.0002)'

# 5. Set transaction variables:
#    export UTXO_ID=\"<txid>:0\"
#    export INPUT_AMOUNT=\"<total_input_satoshis>\"

# 6. Deploy using Initialize spell:
#    cat spells/initialize.yaml | envsubst | \
#    charms spell check --app-bins=$(charms app build) --mock

# ============================================================
# Validation Rules (Enforced by Frontend)
# ============================================================

# Owner Pubkey: 64 hex characters (32 bytes)
# Heir Pubkey: 64 hex characters (32 bytes)
# Heir Address: Bitcoin address (tb1p for testnet, bc1p for mainnet)
# Vault Amount: 0.001 to 21 BTC
# Timeout Blocks: 26,000 to 520,000 blocks (~3 months to 5 years)
# Network: testnet, livenet, or signet

# ============================================================
# Example Complete Setup
# ============================================================

# Frontend collects from user:
export OWNER_PUBKEY=\"0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20\"
export OWNER_ADDRESS=\"tb1paa4c5c6c7c8c9cacbcccdcedcfcecedcccccccccccccccccccccccccccccc\"
export HEIR_PUBKEY=\"201f1e1d1c1b1a19181716151413121110080706050403020100\"
export HEIR_ADDRESS=\"tb1pbb5d6d7d8d9dbdcdbecbebecbddcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd\"
export VAULT_AMOUNT_BTC=\"1.5\"
export TIMEOUT_BLOCKS=\"52000\"
export NETWORK=\"testnet\"

# Frontend generates:
export APP_VK=\"c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337\"
export VAULT_VALUE=\"150000000\"

# User gets UTXO and provides:
export UTXO_ID=\"abc123...def456:0\"
export INPUT_AMOUNT=\"160000000\"

# Then deploy using Initialize spell!
