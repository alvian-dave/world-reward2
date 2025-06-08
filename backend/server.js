import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import axios from 'axios';
import sqlite3 from 'sqlite3';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database(process.env.DATABASE_PATH || './database.sqlite');

// Initialize database tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nullifier_hash TEXT UNIQUE NOT NULL,
      verification_level TEXT NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      balance REAL DEFAULT 0,
      total_staked REAL DEFAULT 0,
      last_claim_time INTEGER DEFAULT 0,
      last_stake_time INTEGER DEFAULT 0,
      total_claimed REAL DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nullifier_hash TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      tx_hash TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
});

// Smart contract setup
let provider, contract, wallet;

try {
  if (process.env.RPC_URL && process.env.CONTRACT_ADDRESS && process.env.PRIVATE_KEY) {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Contract ABI (simplified - you need to add the full ABI)
    const contractABI = [
      "function registerUser(string memory nullifierHash, bool isVerified) external",
      "function stake(string memory nullifierHash, uint256 amount) external",
      "function unstake(string memory nullifierHash) external",
      "function claimStakingReward(string memory nullifierHash) external",
      "function compoundStakingReward(string memory nullifierHash) external",
      "function claimTimeReward(string memory nullifierHash, uint256 amount) external",
      "function getUserInfo(string memory nullifierHash) external view returns (uint256, uint256, uint256, uint256, bool, uint256, uint256)",
      "function balanceOf(address account) external view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)"
    ];
    
    contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);
  }
} catch (error) {
  console.error('Smart contract setup error:', error);
}

// Helper functions
const getUser = (nullifierHash) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE nullifier_hash = ?',
      [nullifierHash],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

const updateUser = (nullifierHash, updates) => {
  return new Promise((resolve, reject) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(nullifierHash);
    
    db.run(
      `UPDATE users SET ${fields} WHERE nullifier_hash = ?`,
      values,
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
};

// Routes

// World ID verification
app.post('/api/auth/verify-world-id', async (req, res) => {
  try {
    const { proof, merkle_root, nullifier_hash, verification_level } = req.body;

    // Verify with World ID
    const verifyResponse = await axios.post('https://developer.worldcoin.org/api/v1/verify/' + process.env.WORLD_ID_APP_ID, {
      nullifier_hash,
      merkle_root,
      proof,
      verification_level,
      action: process.env.WORLD_ID_ACTION || 'claim-reward'
    });

    if (verifyResponse.data.success) {
      const isVerified = verification_level === 'orb';
      
      // Check if user exists
      let user = await getUser(nullifier_hash);
      
      if (!user) {
        // Create new user
        db.run(
          'INSERT INTO users (nullifier_hash, verification_level, is_verified, last_claim_time) VALUES (?, ?, ?, ?)',
          [nullifier_hash, verification_level, isVerified, Math.floor(Date.now() / 1000)],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
          }
        );

        // Register user in smart contract if available
        if (contract) {
          try {
            await contract.registerUser(nullifier_hash, isVerified);
          } catch (contractError) {
            console.error('Smart contract registration error:', contractError);
          }
        }
      }

      res.json({
        success: true,
        nullifier_hash,
        verification_level,
        is_verified: isVerified
      });
    } else {
      res.status(400).json({ error: 'World ID verification failed' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get user balance
app.get('/api/user/balance/:nullifierHash', async (req, res) => {
  try {
    const user = await getUser(req.params.nullifierHash);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ balance: user.balance || 0 });
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Get claimable amount (time-based reward)
app.get('/api/claim/status/:nullifierHash', async (req, res) => {
  try {
    const user = await getUser(req.params.nullifierHash);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = Math.floor(Date.now() / 1000);
    const timeDiff = now - (user.last_claim_time || now);
    const rewardRate = user.is_verified ? 0.000024 : 0.000012; // WRC per second
    const claimable = timeDiff * rewardRate;

    res.json({ claimable: Math.max(0, claimable) });
  } catch (error) {
    console.error('Claim status error:', error);
    res.status(500).json({ error: 'Failed to fetch claim status' });
  }
});

// Execute claim
app.post('/api/claim/execute', async (req, res) => {
  try {
    const { nullifier_hash, amount } = req.body;
    const user = await getUser(nullifier_hash);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const claimAmount = amount || 0;
    if (claimAmount <= 0) {
      return res.status(400).json({ error: 'No claimable amount' });
    }

    // Update user balance and last claim time
    await updateUser(nullifier_hash, {
      balance: (user.balance || 0) + claimAmount,
      last_claim_time: Math.floor(Date.now() / 1000),
      total_claimed: (user.total_claimed || 0) + claimAmount
    });

    // Record transaction
    db.run(
      'INSERT INTO transactions (nullifier_hash, type, amount, status) VALUES (?, ?, ?, ?)',
      [nullifier_hash, 'claim', claimAmount, 'completed']
    );

    res.json({ claimed: claimAmount });
  } catch (error) {
    console.error('Claim execute error:', error);
    res.status(500).json({ error: 'Claim failed' });
  }
});

// Stake tokens
app.post('/api/stake', async (req, res) => {
  try {
    const { nullifier_hash, amount } = req.body;
    const user = await getUser(nullifier_hash);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (amount <= 0 || amount > (user.balance || 0)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Update user balance and staked amount
    await updateUser(nullifier_hash, {
      balance: (user.balance || 0) - amount,
      total_staked: (user.total_staked || 0) + amount,
      last_stake_time: Math.floor(Date.now() / 1000)
    });

    // Record transaction
    db.run(
      'INSERT INTO transactions (nullifier_hash, type, amount, status) VALUES (?, ?, ?, ?)',
      [nullifier_hash, 'stake', amount, 'completed']
    );

    res.json({ staked: amount });
  } catch (error) {
    console.error('Stake error:', error);
    res.status(500).json({ error: 'Stake failed' });
  }
});

// Unstake tokens
app.post('/api/stake/unstake', async (req, res) => {
  try {
    const { nullifier_hash } = req.body;
    const user = await getUser(nullifier_hash);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stakedAmount = user.total_staked || 0;
    if (stakedAmount <= 0) {
      return res.status(400).json({ error: 'No staked amount' });
    }

    // Calculate staking rewards (70% APY)
    const now = Math.floor(Date.now() / 1000);
    const stakingTime = now - (user.last_stake_time || now);
    const annualReward = stakedAmount * 0.70; // 70% APY
    const stakingReward = (annualReward * stakingTime) / (365 * 24 * 60 * 60);
    
    const totalAmount = stakedAmount + stakingReward;

    // Update user balance
    await updateUser(nullifier_hash, {
      balance: (user.balance || 0) + totalAmount,
      total_staked: 0,
      last_stake_time: now
    });

    // Record transaction
    db.run(
      'INSERT INTO transactions (nullifier_hash, type, amount, status) VALUES (?, ?, ?, ?)',
      [nullifier_hash, 'unstake', totalAmount, 'completed']
    );

    res.json({ unstaked: totalAmount });
  } catch (error) {
    console.error('Unstake error:', error);
    res.status(500).json({ error: 'Unstake failed' });
  }
});

// Get staking reward
app.get('/api/stake/reward/:nullifierHash', async (req, res) => {
  try {
    const user = await getUser(req.params.nullifierHash);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stakedAmount = user.total_staked || 0;
    if (stakedAmount <= 0) {
      return res.json({ reward: 0 });
    }

    // Calculate staking rewards (70% APY)
    const now = Math.floor(Date.now() / 1000);
    const stakingTime = now - (user.last_stake_time || now);
    const annualReward = stakedAmount * 0.70; // 70% APY
    const reward = (annualReward * stakingTime) / (365 * 24 * 60 * 60);

    res.json({ reward: Math.max(0, reward) });
  } catch (error) {
    console.error('Reward fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch reward' });
  }
});

// Get total staked amount
app.get('/api/stake/total/:nullifierHash', async (req, res) => {
  try {
    const user = await getUser(req.params.nullifierHash);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ total_stake: user.total_staked || 0 });
  } catch (error) {
    console.error('Total stake fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch total stake' });
  }
});

// Compound staking reward
app.post('/api/stake/compound', async (req, res) => {
  try {
    const { nullifier_hash } = req.body;
    const user = await getUser(nullifier_hash);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stakedAmount = user.total_staked || 0;
    if (stakedAmount <= 0) {
      return res.status(400).json({ error: 'No staked amount' });
    }

    // Calculate staking rewards
    const now = Math.floor(Date.now() / 1000);
    const stakingTime = now - (user.last_stake_time || now);
    const annualReward = stakedAmount * 0.70; // 70% APY
    const reward = (annualReward * stakingTime) / (365 * 24 * 60 * 60);

    if (reward <= 0) {
      return res.status(400).json({ error: 'No reward to compound' });
    }

    // Add reward to staked amount
    await updateUser(nullifier_hash, {
      total_staked: stakedAmount + reward,
      last_stake_time: now
    });

    res.json({ compounded: reward });
  } catch (error) {
    console.error('Compound error:', error);
    res.status(500).json({ error: 'Compound failed' });
  }
});

// Claim staking reward
app.post('/api/stake/claim-reward', async (req, res) => {
  try {
    const { nullifier_hash } = req.body;
    const user = await getUser(nullifier_hash);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stakedAmount = user.total_staked || 0;
    if (stakedAmount <= 0) {
      return res.status(400).json({ error: 'No staked amount' });
    }

    // Calculate staking rewards
    const now = Math.floor(Date.now() / 1000);
    const stakingTime = now - (user.last_stake_time || now);
    const annualReward = stakedAmount * 0.70; // 70% APY
    const reward = (annualReward * stakingTime) / (365 * 24 * 60 * 60);

    if (reward <= 0) {
      return res.status(400).json({ error: 'No reward to claim' });
    }

    // Add reward to balance
    await updateUser(nullifier_hash, {
      balance: (user.balance || 0) + reward,
      last_stake_time: now,
      total_claimed: (user.total_claimed || 0) + reward
    });

    res.json({ claimed: reward });
  } catch (error) {
    console.error('Claim reward error:', error);
    res.status(500).json({ error: 'Claim reward failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const configStatus = {
    worldId: !!process.env.WORLD_ID_APP_ID,
    contract: !!process.env.CONTRACT_ADDRESS,
    rpc: !!process.env.RPC_URL,
    privateKey: !!process.env.PRIVATE_KEY
  };

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: configStatus
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 World Reward Coin Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  
  // Check configuration
  const requiredEnvVars = ['WORLD_ID_APP_ID', 'CONTRACT_ADDRESS', 'RPC_URL', 'PRIVATE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('⚠️  Some features may not work properly');
  } else {
    console.log('✅ All environment variables configured');
  }
});