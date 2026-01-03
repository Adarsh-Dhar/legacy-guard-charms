/**
 * Deployment helper to integrate frontend with legacy-guard contract
 */

export interface VaultDeploymentConfig {
  ownerPubkey: string;
  heirPubkey: string;
  heirAddress: string;
  amount: number;
  timeoutBlocks: number;
  network: string;
}

/**
 * Convert a public key to the format expected by the contract (32 bytes hex)
 */
export function formatPublicKey(pubkeyHex: string): string {
  // Remove 0x prefix if present
  let cleaned = pubkeyHex.startsWith("0x") ? pubkeyHex.slice(2) : pubkeyHex;
  
  // Pad to 64 characters (32 bytes)
  if (cleaned.length < 64) {
    cleaned = cleaned.padStart(64, "0");
  }
  
  // Validate hex format
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    throw new Error("Invalid public key format. Must be 32 bytes (64 hex characters)");
  }
  
  return cleaned.toLowerCase();
}

/**
 * Convert Bitcoin amount (BTC) to satoshis
 */
export function btcToSatoshis(btc: number): number {
  return Math.round(btc * 100_000_000);
}

/**
 * Convert satoshis to BTC
 */
export function satoshisToBtc(satoshis: number): number {
  return satoshis / 100_000_000;
}

/**
 * Get timeout blocks from timeout key
 */
export function getTimeoutBlocks(timeoutKey: string): number {
  const timeoutMap: Record<string, number> = {
    "3-months": 26_000,
    "6-months": 52_000,
    "1-year": 104_000,
    "5-years": 520_000,
  };
  return timeoutMap[timeoutKey] || 52_000; // Default to 1 year
}

/**
 * Generate environment variables for deployment
 */
export function generateDeploymentEnv(config: VaultDeploymentConfig): string {
  const ownerKey = formatPublicKey(config.ownerPubkey);
  const heirKey = formatPublicKey(config.heirPubkey);
  const satoshis = btcToSatoshis(config.amount);

  const lines = [
    "#!/bin/bash",
    "# Legacy Guard Vault Deployment Script",
    `# Generated for ${config.network} network`,
    "",
    `export APP_VK="c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"`,
    `export OWNER_PUBKEY="${ownerKey}"`,
    `export HEIR_PUBKEY="${heirKey}"`,
    `export HEIR_ADDRESS="${config.heirAddress}"`,
    `export VAULT_VALUE="${satoshis}"`,
    `export VAULT_AMOUNT_BTC="${config.amount}"`,
    `export TIMEOUT_BLOCKS="${config.timeoutBlocks}"`,
    `export NETWORK="${config.network}"`,
    "",
    "# Note: You'll need to set these manually after getting a UTXO",
    '# export UTXO_ID="..."  # From bitcoin-cli listunspent',
    '# export UTXO_INDEX="0"',
    '# export INPUT_AMOUNT="..."  # Total input amount in satoshis',
  ];

  return lines.join("\n");
}

/**
 * Generate the Initialize spell YAML for deployment
 */
export function generateInitializeSpell(
  config: VaultDeploymentConfig,
  utxoId: string,
  utxoIndex: number = 0
): string {
  const ownerKey = formatPublicKey(config.ownerPubkey);
  const heirKey = formatPublicKey(config.heirPubkey);
  const satoshis = btcToSatoshis(config.amount);

  const lines = [
    "version: 1",
    "",
    "inputs:",
    `  - utxo: "${utxoId}:${utxoIndex}"`,
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
 * Generate the Pulse spell YAML for heartbeat
 */
export function generatePulseSpell(
  vaultUtxo: string,
  amount: number,
  heirAddress: string
): string {
  const satoshis = btcToSatoshis(amount);

  const lines = [
    "version: 1",
    "",
    "inputs:",
    `  - utxo: "${vaultUtxo}:0"`,
    "    charms:",
    `      - app: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"`,
    "",
    "outputs:",
    `  - value: ${satoshis}`,
    "    charms:",
    `      - app: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"`,
    "        data:",
    "          action: Pulse",
    "    # Funds remain in enchanted UTXO controlled by contract",
  ];

  return lines.join("\n");
}

/**
 * Generate the Claim spell YAML for heir
 */
export function generateClaimSpell(
  vaultUtxo: string,
  amount: number,
  heirAddress: string
): string {
  const satoshis = btcToSatoshis(amount);

  const lines = [
    "version: 1",
    "",
    "inputs:",
    `  - utxo: "${vaultUtxo}:0"`,
    "    charms:",
    `      - app: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"`,
    "",
    "outputs:",
    `  - address: "${heirAddress}"`,
    `    value: ${satoshis}`,
    "    # NOTE: No charms - releases funds to heir's standard Bitcoin address",
  ];

  return lines.join("\n");
}

/**
 * Validate vault parameters
 */
export function validateVaultConfig(config: VaultDeploymentConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.amount <= 0) {
    errors.push("Amount must be greater than 0");
  }

  if (config.amount > 21) {
    errors.push("Amount cannot exceed 21 BTC");
  }

  if (config.timeoutBlocks <= 0) {
    errors.push("Timeout blocks must be greater than 0");
  }

  try {
    formatPublicKey(config.ownerPubkey);
  } catch (e) {
    errors.push(`Invalid owner public key: ${(e as Error).message}`);
  }

  try {
    formatPublicKey(config.heirPubkey);
  } catch (e) {
    errors.push(`Invalid heir public key: ${(e as Error).message}`);
  }

  if (!config.heirAddress.match(/^(bc1|tb1|bcrt1|tc1)[a-z0-9]{39,87}$/)) {
    errors.push("Invalid Bitcoin address format");
  }

  if (config.network !== "testnet" && config.network !== "livenet" && config.network !== "signet") {
    errors.push("Network must be testnet, signet, or livenet");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate deployment report with all parameters
 */
export function generateDeploymentReport(config: VaultDeploymentConfig): string {
  const validation = validateVaultConfig(config);
  
  if (!validation.valid) {
    const errorMsg = validation.errors.map(e => `  - ${e}`).join("\n");
    return `Invalid Configuration:\n${errorMsg}`;
  }

  const satoshis = btcToSatoshis(config.amount);
  const usdValue = (config.amount * 42500).toFixed(2);
  const daysRemaining = (config.timeoutBlocks * 10 / 60 / 24).toFixed(1);

  const lines = [
    "Vault Deployment Report",
    "",
    "Configuration:",
    `  Network: ${config.network}`,
    `  Owner Pubkey: ${formatPublicKey(config.ownerPubkey).slice(0, 16)}...`,
    `  Heir Pubkey: ${formatPublicKey(config.heirPubkey).slice(0, 16)}...`,
    `  Heir Address: ${config.heirAddress}`,
    "",
    "Amount:",
    `  BTC: ${config.amount}`,
    `  Satoshis: ${satoshis.toLocaleString()}`,
    `  USD: $${usdValue}`,
    "",
    "Timeout:",
    `  Blocks: ${config.timeoutBlocks.toLocaleString()}`,
    `  Est. Time: ~${daysRemaining} days`,
    "",
    "Contract:",
    `  Verification Key: c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337`,
  ];

  return lines.join("\n");
}

/**
 * Get public key from wallet address (requires wallet integration)
 */
export async function getPubkeyFromUnisat(window: any): Promise<string> {
  if (typeof window === "undefined" || !window.unisat) {
    throw new Error("UniSat wallet not found");
  }

  try {
    const pubkey = await window.unisat.getPublicKey();
    return pubkey;
  } catch (error) {
    console.error("Failed to get public key from UniSat:", error);
    throw error;
  }
}
