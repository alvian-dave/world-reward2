# 🌐 World Reward Coin

Mini app untuk World App yang memberikan reward WRC token kepada pengguna yang terverifikasi dengan World ID.

## 🚀 Fitur

- **World ID Integration**: Koneksi langsung dengan World ID untuk verifikasi
- **Auto Reward**: Reward otomatis setiap detik (0.000024 WRC untuk terverifikasi, 0.000012 WRC untuk belum terverifikasi)
- **Staking**: APY 70% tanpa lock period
- **Mobile Responsive**: UI dioptimalkan untuk mobile
- **Smart Contract**: ERC-20 token dengan fitur staking dan reward

## 📋 Konfigurasi yang Diperlukan

### 1. World ID Configuration
Buat aplikasi di [World ID Developer Portal](https://developer.worldcoin.org/):
- `WORLD_ID_APP_ID`: App ID dari World ID
- `WORLD_ID_ACTION`: Action ID (default: "claim-reward")

### 2. Smart Contract Configuration
- `CONTRACT_ADDRESS`: Alamat smart contract WRC yang sudah di-deploy
- `RPC_URL`: RPC endpoint (contoh: https://mainnet.optimism.io)
- `CHAIN_ID`: Chain ID (10 untuk Optimism)
- `PRIVATE_KEY`: Private key untuk deploy dan transaksi

### 3. Setup Environment Variables

#### Frontend (.env)
```bash
cp .env.example .env
```

Isi file `.env` dengan:
```
VITE_WORLD_ID_APP_ID=your_world_id_app_id_here
VITE_WORLD_ID_ACTION=claim-reward
VITE_CONTRACT_ADDRESS=your_wrc_contract_address_here
VITE_RPC_URL=https://mainnet.optimism.io
VITE_CHAIN_ID=10
VITE_API_BASE_URL=http://localhost:3001/api
```

#### Backend (backend/.env)
```bash
cd backend
cp .env.example .env
```

Isi file `backend/.env` dengan:
```
PORT=3001
WORLD_ID_APP_ID=your_world_id_app_id_here
WORLD_ID_ACTION=claim-reward
CONTRACT_ADDRESS=your_wrc_contract_address_here
PRIVATE_KEY=your_private_key_here
RPC_URL=https://mainnet.optimism.io
CHAIN_ID=10
DATABASE_PATH=./database.sqlite
JWT_SECRET=your_jwt_secret_here
```

## 🛠️ Instalasi dan Menjalankan

### 1. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Deploy Smart Contract
```bash
cd contracts
node deploy.js
```

### 3. Jalankan Backend
```bash
cd backend
npm run dev
```

### 4. Jalankan Frontend
```bash
npm run dev
```

## 📱 Cara Menggunakan

1. **Connect World ID**: Klik tombol "Connect dengan World ID" di halaman awal
2. **Verifikasi**: Lakukan verifikasi dengan World ID (Orb verification untuk rate reward lebih tinggi)
3. **Claim Reward**: Reward akan berjalan otomatis setiap detik, klik "Claim Sekarang" untuk mengklaim
4. **Staking**: Masukkan jumlah WRC yang ingin di-stake untuk mendapat APY 70%
5. **Compound/Claim Reward**: Kelola reward staking dengan compound atau claim

## 🔧 Troubleshooting

### Error: Konfigurasi Belum Lengkap
- Pastikan semua environment variables sudah diisi dengan benar
- Periksa file `.env` di root dan `backend/.env`

### Error: World ID Connection Failed
- Pastikan `WORLD_ID_APP_ID` sudah benar
- Cek koneksi internet
- Pastikan aplikasi sudah terdaftar di World ID Developer Portal

### Error: Smart Contract Interaction Failed
- Pastikan `CONTRACT_ADDRESS` sudah benar
- Cek `RPC_URL` dan `PRIVATE_KEY`
- Pastikan contract sudah di-deploy dengan benar

## 📚 API Endpoints

### Authentication
- `POST /api/auth/verify-world-id` - Verifikasi World ID proof

### User
- `GET /api/user/balance/:nullifierHash` - Get user balance
- `GET /api/claim/status/:nullifierHash` - Get claimable amount
- `POST /api/claim/execute` - Execute claim

### Staking
- `POST /api/stake` - Stake tokens
- `POST /api/stake/unstake` - Unstake all tokens
- `GET /api/stake/total/:nullifierHash` - Get total staked
- `GET /api/stake/reward/:nullifierHash` - Get staking reward
- `POST /api/stake/compound` - Compound staking reward
- `POST /api/stake/claim-reward` - Claim staking reward

### Health
- `GET /api/health` - Health check and config status

## 🔐 Security

- World ID verification untuk mencegah sybil attack
- Private key disimpan di environment variables
- Rate limiting pada API endpoints
- Input validation dan sanitization

## 📄 License

MIT License - Lihat file LICENSE untuk detail lengkap.