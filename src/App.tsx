import React, { useState, useEffect } from 'react';
import { WorldIDConnect } from './components/WorldIDConnect';
import { Dashboard } from './components/Dashboard';

interface UserData {
  nullifierHash: string;
  isVerified: boolean;
  verificationLevel: string;
}

function App() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check if user is already connected (from localStorage)
  useEffect(() => {
    const savedUserData = localStorage.getItem('worldRewardCoinUser');
    if (savedUserData) {
      try {
        const parsedData = JSON.parse(savedUserData);
        setUserData(parsedData);
        setIsConnected(true);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('worldRewardCoinUser');
      }
    }
  }, []);

  const handleConnect = (data: UserData) => {
    setUserData(data);
    setIsConnected(true);
    // Save to localStorage for persistence
    localStorage.setItem('worldRewardCoinUser', JSON.stringify(data));
  };

  const handleDisconnect = () => {
    setUserData(null);
    setIsConnected(false);
    localStorage.removeItem('worldRewardCoinUser');
  };

  if (!isConnected || !userData) {
    return <WorldIDConnect onConnect={handleConnect} />;
  }

  return <Dashboard userData={userData} onDisconnect={handleDisconnect} />;
}

export default App;