import React, { useState, useEffect } from 'react';
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';

// Konfigurasi World ID - GANTI DENGAN DATA ANDA
const WORLD_ID_CONFIG = {
  app_id: process.env.REACT_APP_WORLD_ID_APP_ID || 'app_4c3901d98b68674fa523b3dc99dc6d5b', // Ganti dengan App ID Anda
  action: 'sign-in', // Action ID yang sudah Anda daftarkan
  verification_level: VerificationLevel.Orb, // atau VerificationLevel.Device untuk testing
};

// Konfigurasi Smart Contract - GANTI DENGAN DATA ANDA
const CONTRACT_CONFIG = {
  contractAddress: '0xb40447569e18F7f39378a70375259069B938E59A', // Alamat contract Anda di Worldchain
  chainId: 480, // Worldchain Mainnet
  rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public', // RPC Worldchain
};

interface UserProfile {
  nullifierHash: string;
  merkleRoot: string;
  proof: string;
  verificationLevel: string;
  isVerified: boolean;
}

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Cek apakah aplikasi berjalan di World App
  const isInWorldApp = () => {
    return typeof window !== 'undefined' && 
           (window.location.hostname.includes('worldcoin') || 
            window.navigator.userAgent.includes('WorldApp'));
  };

  // Handle successful World ID verification
  const handleVerifySuccess = async (result: ISuccessResult) => {
    console.log('Verification successful:', result);
    setIsLoading(true);
    setError('');

    try {
      // Simpan data user
      const userProfile: UserProfile = {
        nullifierHash: result.nullifier_hash,
        merkleRoot: result.merkle_root,
        proof: result.proof,
        verificationLevel: result.verification_level,
        isVerified: true,
      };
      
      setUser(userProfile);

      // Kirim data ke backend untuk verifikasi dan claim reward
      await verifyAndClaimReward(result);
      
    } catch (err) {
      console.error('Error processing verification:', err);
      setError('Gagal memproses verifikasi. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification error
  const handleVerifyError = (error: any) => {
    console.error('Verification failed:', error);
    setError('Verifikasi gagal. Pastikan Anda menggunakan World App yang valid.');
  };

  // Fungsi untuk verifikasi dan claim reward
  const verifyAndClaimReward = async (verificationData: ISuccessResult) => {
    try {
      // Di sini Anda perlu implementasi untuk:
      // 1. Verifikasi proof ke World ID
      // 2. Interact dengan smart contract untuk claim reward
      
      const response = await fetch('/api/verify-and-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...verificationData,
          contractAddress: CONTRACT_CONFIG.contractAddress,
        }),
      });

      if (response.ok) {
        setRewardClaimed(true);
      } else {
        throw new Error('Failed to claim reward');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      setError('Gagal mengklaim reward. Silakan coba lagi.');
    }
  };

  // Reset state
  const handleReset = () => {
    setUser(null);
    setRewardClaimed(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">World Reward App</h1>
          <p className="text-gray-600">Verifikasi identitas Anda dengan World ID untuk mengklaim reward</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {!user && !rewardClaimed && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Catatan:</strong> Aplikasi ini harus diakses melalui World App untuk berfungsi dengan baik.
              </p>
            </div>

            <IDKitWidget
              app_id={WORLD_ID_CONFIG.app_id}
              action={WORLD_ID_CONFIG.action}
              verification_level={WORLD_ID_CONFIG.verification_level}
              handleVerify={handleVerifySuccess}
              onError={handleVerifyError}
            >
              {({ open }) => (
                <button
                  onClick={open}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                        <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verifikasi dengan World ID
                    </>
                  )}
                </button>
              )}
            </IDKitWidget>
          </div>
        )}

        {user && !rewardClaimed && (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Verifikasi Berhasil!</h3>
              <p className="text-green-700 text-sm">Identitas Anda telah diverifikasi dengan World ID</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h4 className="font-semibold text-gray-800 mb-2">Detail Verifikasi:</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Level:</strong> {user.verificationLevel}</p>
                <p><strong>Nullifier:</strong> {user.nullifierHash.substring(0, 10)}...</p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Verifikasi Ulang
            </button>
          </div>
        )}

        {rewardClaimed && (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <h3 className="text-xl font-bold text-green-800 mb-2">Reward Berhasil Diklaim!</h3>
              <p className="text-green-700">Token reward telah dikirim ke wallet Anda</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Klaim Lagi
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-xs text-gray-500">
            Powered by World ID • Secure & Private
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
