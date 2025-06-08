// Configuration file - MASUKKAN DATA ANDA DI SINI
export const CONFIG = {
  // World ID Configuration
  WORLD_ID: {
    APP_ID: import.meta.env.VITE_WORLD_ID_APP_ID || '', // Masukkan World ID App ID Anda
    ACTION: import.meta.env.VITE_WORLD_ID_ACTION || 'claim-reward', // Action ID untuk World ID
    SIGNAL: import.meta.env.VITE_WORLD_ID_SIGNAL || 'world-reward-coin'
  },

  // Smart Contract Configuration
  CONTRACT: {
    ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS || '', // Masukkan alamat smart contract WRC
    RPC_URL: import.meta.env.VITE_RPC_URL || '', // Masukkan RPC URL (contoh: https://mainnet.optimism.io)
    CHAIN_ID: import.meta.env.VITE_CHAIN_ID || '10' // Chain ID (10 untuk Optimism)
  },

  // API Configuration
  API: {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    WORLD_ID_VERIFY_URL: 'https://developer.worldcoin.org/api/v1/verify'
  },

  // Token Configuration
  TOKEN: {
    SYMBOL: 'WRC',
    DECIMALS: 18,
    REWARD_RATE_VERIFIED: 0.000024, // WRC per detik untuk user terverifikasi
    REWARD_RATE_UNVERIFIED: 0.000012, // WRC per detik untuk user belum terverifikasi
    STAKING_APY: 0.70 // 70% APY
  }
};

// Validasi konfigurasi
export const validateConfig = () => {
  const errors: string[] = [];

  if (!CONFIG.WORLD_ID.APP_ID) {
    errors.push('VITE_WORLD_ID_APP_ID belum diset');
  }

  if (!CONFIG.CONTRACT.ADDRESS) {
    errors.push('VITE_CONTRACT_ADDRESS belum diset');
  }

  if (!CONFIG.CONTRACT.RPC_URL) {
    errors.push('VITE_RPC_URL belum diset');
  }

  return errors;
};