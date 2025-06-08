import React, { useEffect, useState } from 'react';
import { Globe, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { CONFIG, validateConfig } from '../config/config';

interface WorldIDConnectProps {
  onConnect: (userData: any) => void;
}

declare global {
  interface Window {
    WorldIDWidget: any;
  }
}

export const WorldIDConnect: React.FC<WorldIDConnectProps> = ({ onConnect }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [configErrors, setConfigErrors] = useState<string[]>([]);

  useEffect(() => {
    // Validasi konfigurasi saat komponen dimount
    const errors = validateConfig();
    setConfigErrors(errors);

    // Load World ID Widget script
    if (errors.length === 0) {
      const script = document.createElement('script');
      script.src = 'https://id.worldcoin.org/js';
      script.async = true;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, []);

  const handleWorldIDConnect = async () => {
    if (configErrors.length > 0) {
      alert('Konfigurasi belum lengkap. Silakan periksa file .env');
      return;
    }

    setIsLoading(true);

    try {
      if (typeof window.WorldIDWidget !== 'undefined') {
        window.WorldIDWidget.init('world-id-container', {
          app_id: CONFIG.WORLD_ID.APP_ID,
          action: CONFIG.WORLD_ID.ACTION,
          signal: CONFIG.WORLD_ID.SIGNAL,
          enableTelemetry: true,
          onSuccess: async (result: any) => {
            console.log('World ID verification successful:', result);
            
            // Verify proof dengan backend
            try {
              const response = await fetch(`${CONFIG.API.BASE_URL}/auth/verify-world-id`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  proof: result.proof,
                  merkle_root: result.merkle_root,
                  nullifier_hash: result.nullifier_hash,
                  verification_level: result.verification_level
                }),
              });

              if (response.ok) {
                const userData = await response.json();
                onConnect({
                  nullifierHash: result.nullifier_hash,
                  verificationLevel: result.verification_level,
                  isVerified: result.verification_level === 'orb',
                  ...userData
                });
              } else {
                throw new Error('Verifikasi gagal');
              }
            } catch (error) {
              console.error('Verification error:', error);
              alert('Verifikasi World ID gagal. Silakan coba lagi.');
            }
            
            setIsLoading(false);
          },
          onError: (error: any) => {
            console.error('World ID error:', error);
            alert('Koneksi World ID gagal. Silakan coba lagi.');
            setIsLoading(false);
          },
        });
      } else {
        throw new Error('World ID Widget tidak tersedia');
      }
    } catch (error) {
      console.error('World ID connection error:', error);
      alert('Gagal memuat World ID. Silakan refresh halaman.');
      setIsLoading(false);
    }
  };

  if (configErrors.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h2 className="text-xl font-bold text-gray-900">Konfigurasi Belum Lengkap</h2>
              <div className="text-left space-y-2">
                <p className="text-sm text-gray-600 mb-3">Silakan lengkapi konfigurasi berikut:</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {configErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
              <div className="text-xs text-gray-500 mt-4">
                <p>Buat file .env dari .env.example dan isi dengan data yang diperlukan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <Globe className="w-16 h-16 text-blue-600 mx-auto" />
              <h1 className="text-2xl font-bold text-gray-900">🌐 World Reward Coin</h1>
              <p className="text-gray-600">Dapatkan reward WRC setiap detik dengan World ID</p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Keuntungan Bergabung:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Reward otomatis setiap detik</li>
                  <li>• Staking dengan APY 70%</li>
                  <li>• Bonus untuk user terverifikasi</li>
                  <li>• Tanpa biaya gas</li>
                </ul>
              </div>

              <div id="world-id-container"></div>
              
              <Button 
                onClick={handleWorldIDConnect}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Menghubungkan...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Globe className="w-5 h-5" />
                    <span>Connect dengan World ID</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              <p>Dengan menghubungkan, Anda menyetujui syarat dan ketentuan kami</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};