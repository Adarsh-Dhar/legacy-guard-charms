/**
 * Contract Integration Utilities
 * Connects the legacy-guard contract with frontend wallet and deployment flows
 */

import {
  VaultDeploymentConfig,
  formatPublicKey,
  btcToSatoshis,
  generateInitializeSpell,
  generatePulseSpell,
  generateClaimSpell,
  validateVaultConfig,
  generateDeploymentReport,
} from "./deployment";
import { LEGACY_GUARD_CONFIG } from "./config";

/**
 * Vault State Structure (matches contract state)
 */
export interface ContractVaultState {
  ownerPubkey: string;
  heirPubkey: string;
  lastHeartbeat: number;
  timeoutBlocks: number;
}

/**
 * Data structure for frontend vault display
 */
export interface VaultDisplay {
  address: string;
  owner: string;
  heir: string;
  amount: number;
  amountSatoshis: number;
  timeoutBlocks: number;
  lastHeartbeat: number;
  status: "active" | "expired" | "claimed";
  daysRemaining: number;
  blocksRemaining: number;
}

/**
 * Contract action types
 */
export type ContractAction = "Initialize" | "Pulse" | "Claim";

/**
 * Create vault deployment configuration from form data
 */
export function createVaultConfig(
  ownerPubkey: string,
  heirPubkey: string,
  heirAddress: string,
  amountBtc: number,
  timeoutKey: string,
  network: "testnet" | "livenet" | "signet" = "testnet"
): VaultDeploymentConfig {
  const timeoutBlocks =
    LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS[timeoutKey as keyof typeof LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS] || 52_000;

  return {
    ownerPubkey,
    heirPubkey,
    heirAddress,
    amount: amountBtc,
    timeoutBlocks,
    network,
  };
}

/**
 * Generate complete deployment bundle
 */
export function generateDeploymentBundle(
  ownerPubkey: string,
  heirPubkey: string,
  heirAddress: string,
  amountBtc: number,
  timeoutKey: string,
  utxoId?: string,
  utxoIndex: number = 0,
  network: "testnet" | "livenet" | "signet" = "testnet"
) {
  const config = createVaultConfig(ownerPubkey, heirPubkey, heirAddress, amountBtc, timeoutKey, network);
  const validation = validateVaultConfig(config);

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      config: null,
    };
  }

  const report = generateDeploymentReport(config);
  let initSpell = null;

  if (utxoId) {
    initSpell = generateInitializeSpell(config, utxoId, utxoIndex);
  } else {
    // Generate a template spell without specific UTXO for planning/display
    // The actual spell will use the selected UTXO later
    initSpell = generateInitializeSpellTemplate(config);
  }

  const envVars = generateDeploymentEnvObject(config);

  return {
    success: true,
    errors: [],
    config,
    envVars,
    initSpell,
    // Keep legacy key for callers expecting `spell`
    spell: initSpell,
    report,
  };
}

/**
 * Generate a template spell without a specific UTXO
 */
function generateInitializeSpellTemplate(config: VaultDeploymentConfig): string {
  const ownerKey = formatPublicKey(config.ownerPubkey);
  const heirKey = formatPublicKey(config.heirPubkey);
  const satoshis = btcToSatoshis(config.amount);

  const lines = [
    "version: 1",
    "",
    "inputs:",
    '  - utxo: "<UTXO_ID>:<UTXO_INDEX>"',
    "",
    "outputs:",
    `  - value: ${satoshis}`,
    "    charms:",
    `      - app: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"`,
    "        data:",
    "          action: Initialize",
    `          owner_pubkey: "${ownerKey}"`,
    `          heir_pubkey: "${heirKey}"`,
    `          timeout_blocks: ${config.timeoutBlocks}`,
    "    # NOTE: No 'address' field - creates Taproot address controlled by contract",
  ];

  return lines.join("\n");
}

/**
 * Generate environment variables object (instead of script)
 */
export function generateDeploymentEnvObject(config: VaultDeploymentConfig) {
  return {
    APP_VK: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337",
    OWNER_PUBKEY: formatPublicKey(config.ownerPubkey),
    HEIR_PUBKEY: formatPublicKey(config.heirPubkey),
    HEIR_ADDRESS: config.heirAddress,
    VAULT_VALUE: btcToSatoshis(config.amount),
    VAULT_AMOUNT_BTC: config.amount,
    TIMEOUT_BLOCKS: config.timeoutBlocks,
    NETWORK: config.network,
  };
}

/**
 * Format vault state for display
 */
export function formatVaultDisplay(
  vaultAddress: string,
  vaultState: ContractVaultState,
  amount: number,
  currentBlockHeight: number
): VaultDisplay {
  const blocksRemaining = Math.max(
    0,
    vaultState.lastHeartbeat + vaultState.timeoutBlocks - currentBlockHeight
  );
  const daysRemaining = blocksRemaining * (10 / 60 / 24); // ~10 mins per block

  let status: "active" | "expired" | "claimed" = "active";
  if (blocksRemaining <= 0) {
    status = "expired";
  }

  return {
    address: vaultAddress,
    owner: vaultState.ownerPubkey.slice(0, 16) + "...",
    heir: vaultState.heirPubkey.slice(0, 16) + "...",
    amount,
    amountSatoshis: btcToSatoshis(amount),
    timeoutBlocks: vaultState.timeoutBlocks,
    lastHeartbeat: vaultState.lastHeartbeat,
    status,
    daysRemaining: Math.round(daysRemaining * 10) / 10,
    blocksRemaining,
  };
}

/**
 * Generate spell for specific action
 */
export function generateSpellForAction(
  action: ContractAction,
  vaultUtxo: string,
  amount: number,
  heirAddress: string,
  ownerPubkey?: string,
  heirPubkey?: string,
  timeoutBlocks?: number
): string {
  switch (action) {
    case "Initialize":
      if (!ownerPubkey || !heirPubkey || !timeoutBlocks) {
        throw new Error("Initialize requires ownerPubkey, heirPubkey, and timeoutBlocks");
      }
      const config: VaultDeploymentConfig = {
        ownerPubkey,
        heirPubkey,
        heirAddress,
        amount,
        timeoutBlocks,
        network: "testnet",
      };
      return generateInitializeSpell(config, vaultUtxo, 0);

    case "Pulse":
      return generatePulseSpell(vaultUtxo, amount, heirAddress);

    case "Claim":
      return generateClaimSpell(vaultUtxo, amount, heirAddress);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Extract wallet info for deployment
 */
export interface WalletInfo {
  address: string;
  pubkey: string;
  network: string;
  balance?: number;
}

/**
 * Format wallet info for contract deployment
 */
export function formatWalletForContract(walletInfo: WalletInfo): {
  ownerPubkey: string;
  ownerAddress: string;
} {
  return {
    ownerPubkey: formatPublicKey(walletInfo.pubkey),
    ownerAddress: walletInfo.address,
  };
}

/**
 * Validate amounts for contract
 */
export function validateAmount(amountBtc: number): { valid: boolean; error?: string } {
  if (amountBtc <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  if (amountBtc < LEGACY_GUARD_CONFIG.MIN_AMOUNT) {
    return {
      valid: false,
      error: `Amount must be at least ${LEGACY_GUARD_CONFIG.MIN_AMOUNT} BTC`,
    };
  }

  if (amountBtc > LEGACY_GUARD_CONFIG.MAX_AMOUNT) {
    return {
      valid: false,
      error: `Amount cannot exceed ${LEGACY_GUARD_CONFIG.MAX_AMOUNT} BTC`,
    };
  }

  const satoshis = btcToSatoshis(amountBtc);
  if (satoshis < LEGACY_GUARD_CONFIG.DUST_LIMIT) {
    return {
      valid: false,
      error: `Amount must be at least ${LEGACY_GUARD_CONFIG.DUST_LIMIT} satoshis (dust limit)`,
    };
  }

  return { valid: true };
}

/**
 * Get contract info for display
 */
export function getContractInfo() {
  return {
    verificationKey: LEGACY_GUARD_CONFIG.VERIFICATION_KEY,
    name: "Legacy Guard",
    description: "Dead Man's Switch for Bitcoin Inheritance",
    type: "Charms Application",
    network: "Bitcoin (Testnet/Mainnet/Signet)",
    actions: ["Initialize", "Pulse", "Claim"],
    timeoutOptions: LEGACY_GUARD_CONFIG.TIMEOUT_OPTIONS,
    limits: {
      minAmount: LEGACY_GUARD_CONFIG.MIN_AMOUNT,
      maxAmount: LEGACY_GUARD_CONFIG.MAX_AMOUNT,
      dustLimit: LEGACY_GUARD_CONFIG.DUST_LIMIT,
    },
  };
}
