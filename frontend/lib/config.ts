export const APP_CONFIG = {
  NETWORK: "testnet", // 'livenet' for mainnet
  // There is no numeric Chain ID for Bitcoin, but strictly for reference:
  BITCOIN_TESTNET_NAME: "Bitcoin Testnet",
  // API to fetch data if UniSat is insufficient
  API_URL: "https://mempool.space/testnet/api",
  // The Charms protocol ID you are using (if applicable)
  CHARMS_VERSION: "alpha-v1",
};

// Legacy Guard Contract Configuration
export const LEGACY_GUARD_CONFIG = {
  // Verification key from: charms app vk
  VERIFICATION_KEY: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337",
  // Default timeout options in blocks
  TIMEOUT_OPTIONS: {
    "60-seconds": 1,
    "3-months": 26_000,
    "6-months": 52_000,
    "1-year": 104_000,
    "5-years": 520_000,
  },
  // Bitcoin dust limit in satoshis
  DUST_LIMIT: 546,
  // Default minimum vault amount in BTC
  MIN_AMOUNT: 0.00001,
  // Default maximum vault amount in BTC
  MAX_AMOUNT: 21,
};
