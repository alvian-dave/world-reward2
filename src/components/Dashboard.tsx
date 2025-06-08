import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, LogOut } from 'lucide-react';
import { CONFIG } from '../config/config';

interface DashboardProps {
  userData: {
    nullifierHash: string;
    isVerified: boolean;
    verificationLevel: string;
  };
  onDisconnect: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userData, onDisconnect }) => {
  const [claimable, setClaimable] = useState(0);
  const [balance, setBalance] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [reward, setReward] = useState(0);
  const [stakeInput, setStakeInput] = useState('');
  const [loadingStake, setLoadingStake] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Simulasi reward yang berjalan setiap detik
  useEffect(() => {
    const rewardRate = userData.isVerified 
      ? CONFIG.TOKEN.REWARD_RATE_VERIFIED 
      : CONFIG.TOKEN.REWARD_RATE_UNVERIFIED;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - lastUpdate) / 1000; // dalam detik
      
      setClaimable(prev => prev + (rewardRate * timeDiff));
      setLastUpdate(now);
    }, 1000);

    return () => clearInterval(interval);
  }, [userData.isVerified, lastUpdate]);

  // Fetch data dari API setiap 5 detik
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [balanceRes, stakeRes, rewardRes] = await Promise.all([
          fetch(`${CONFIG.API.BASE_URL}/user/balance/${userData.nullifierHash}`),
          fetch(`${CONFIG.API.BASE_URL}/stake/total/${userData.nullifierHash}`),
          fetch(`${CONFIG.API.BASE_URL}/stake/reward/${userData.nullifierHash}`)
        ]);

        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setBalance(balanceData.balance || 0);
        }

        if (stakeRes.ok) {
          const stakeData = await stakeRes.json();
          setStakeAmount(stakeData.total_stake || 0);
        }

        if (rewardRes.ok) {
          const rewardData = await rewardRes.json();
          setReward(rewardData.reward || 0);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [userData.nullifierHash]);

  const claim = async () => {
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}/claim/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          nullifier_hash: userData.nullifierHash,
          amount: claimable
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Berhasil claim ${result.claimed.toFixed(6)} WRC`);
        setClaimable(0);
        setBalance(prev => prev + result.claimed);
      } else {
        throw new Error('Claim gagal');
      }
    } catch (error) {
      console.error('Claim error:', error);
      alert('Claim gagal. Silakan coba lagi.');
    }
  };

  const stake = async () => {
    if (!stakeInput || parseFloat(stakeInput) <= 0) {
      alert('Masukkan jumlah yang valid');
      return;
    }

    const amount = parseFloat(stakeInput);
    if (amount > balance) {
      alert('Saldo tidak mencukupi');
      return;
    }

    setLoadingStake(true);
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}/stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          nullifier_hash: userData.nullifierHash, 
          amount: amount 
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Berhasil stake ${result.staked.toFixed(6)} WRC`);
        setStakeInput('');
        setBalance(prev => prev - amount);
        setStakeAmount(prev => prev + amount);
      } else {
        throw new Error('Stake gagal');
      }
    } catch (error) {
      console.error('Stake error:', error);
      alert('Stake gagal. Pastikan jumlah valid.');
    } finally {
      setLoadingStake(false);
    }
  };

  const unstake = async () => {
    if (stakeAmount <= 0) {
      alert('Tidak ada yang bisa ditarik');
      return;
    }

    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}/stake/unstake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nullifier_hash: userData.nullifierHash }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Berhasil unstake ${result.unstaked.toFixed(6)} WRC`);
        setBalance(prev => prev + result.unstaked);
        setStakeAmount(0);
      } else {
        throw new Error('Unstake gagal');
      }
    } catch (error) {
      console.error('Unstake error:', error);
      alert('Unstake gagal. Silakan coba lagi.');
    }
  };

  const compound = async () => {
    if (reward <= 0) {
      alert('Tidak ada reward untuk di-compound');
      return;
    }

    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}/stake/compound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nullifier_hash: userData.nullifierHash }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Berhasil compound ${result.compounded.toFixed(6)} WRC`);
        setStakeAmount(prev => prev + result.compounded);
        setReward(0);
      } else {
        throw new Error('Compound gagal');
      }
    } catch (error) {
      console.error('Compound error:', error);
      alert('Compound gagal. Silakan coba lagi.');
    }
  };

  const claimReward = async () => {
    if (reward <= 0) {
      alert('Tidak ada reward untuk diklaim');
      return;
    }

    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}/stake/claim-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nullifier_hash: userData.nullifierHash }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Berhasil claim reward ${result.claimed.toFixed(6)} WRC`);
        setBalance(prev => prev + result.claimed);
        setReward(0);
      } else {
        throw new Error('Claim reward gagal');
      }
    } catch (error) {
      console.error('Claim reward error:', error);
      alert('Claim reward gagal. Silakan coba lagi.');
    }
  };

  const handleStakeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setStakeInput(value);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto grid gap-4 sm:gap-6">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">🌐 World Reward Coin</h1>
          <Button
            onClick={onDisconnect}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </Button>
        </div>

        {/* Status Verifikasi */}
        <div className={`p-3 rounded-lg text-center ${userData.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          <p className="text-sm font-medium">
            {userData.isVerified ? '✅ Terverifikasi Orb' : '⚠️ Belum Terverifikasi Orb'}
          </p>
          <p className="text-xs mt-1">
            Rate reward: {userData.isVerified ? '0.000024' : '0.000012'} WRC/detik
          </p>
        </div>

        {/* CLAIM SECTION */}
        <Card className="rounded-xl shadow-md">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-teal-700">🪙 CLAIM</h2>
            <p className="text-base sm:text-lg">💼 Saldo Wallet: <span className="font-mono text-black">{balance.toFixed(6)}</span> WRC</p>
            <p className="text-base sm:text-lg">🎁 Klaim Tersedia: <span className="font-mono text-green-600">{claimable.toFixed(6)}</span> WRC</p>
            <Button 
              className="w-full bg-teal-500 hover:bg-teal-600 text-white text-sm sm:text-base" 
              onClick={claim}
              disabled={claimable <= 0}
            >
              Claim Sekarang
            </Button>
          </CardContent>
        </Card>

        {/* STAKING SECTION */}
        <Card className="rounded-xl shadow-md">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-yellow-600">💰 STAKING</h2>
            <p className="text-base sm:text-lg">📥 Total Staking: <span className="font-mono text-black">{stakeAmount.toFixed(6)}</span> WRC</p>
            <p className="text-sm text-gray-600">APY: 70% (tanpa lock period)</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                className="bg-gray-100 text-black border-gray-300 focus:ring-teal-500 flex-1"
                placeholder="Jumlah yang ingin di-stake"
                value={stakeInput}
                onChange={handleStakeInputChange}
              />
              <Button
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={stake}
                disabled={loadingStake || !stakeInput || parseFloat(stakeInput) <= 0}
              >
                {loadingStake ? <Loader2 className="animate-spin w-4 h-4" /> : 'Stake'}
              </Button>
            </div>
            <Button 
              className="w-full bg-red-500 hover:bg-red-600 text-white" 
              onClick={unstake}
              disabled={stakeAmount <= 0}
            >
              Tarik Semua
            </Button>
          </CardContent>
        </Card>

        {/* REWARD SECTION */}
        <Card className="rounded-xl shadow-md">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-purple-600">🎉 REWARD</h2>
            <p className="text-base sm:text-lg">💹 Reward Sekarang: <span className="font-mono text-yellow-600">{reward.toFixed(6)}</span> WRC</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white" 
                onClick={compound}
                disabled={reward <= 0}
              >
                Compound Reward
              </Button>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white" 
                onClick={claimReward}
                disabled={reward <= 0}
              >
                Claim Reward
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};