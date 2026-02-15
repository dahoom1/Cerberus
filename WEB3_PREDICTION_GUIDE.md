# Web3 Price Prediction & Crypto Rewards Guide

Complete guide to adding wallet connection, price predictions, and cryptocurrency rewards to your trading platform.

---

## 📋 **Requirements Checklist**

Before implementing, decide on:

- [ ] **Blockchain**: Polygon, BSC, Ethereum, Base, Arbitrum?
- [ ] **Prediction Type**: Binary (UP/DOWN), Price Target, Range?
- [ ] **Timeframes**: 1 hour, 4 hours, 1 day, 1 week?
- [ ] **Minimum Bet**: $1, $5, $10 in crypto?
- [ ] **Platform Fee**: 2%, 5%, 10% of each pool?
- [ ] **Reward Token**: Native token (ETH/MATIC/BNB) or custom token?
- [ ] **Oracle**: Chainlink, API3, or custom backend?

---

## 🏗️ **Architecture Overview**

```
┌─────────────────┐
│   Frontend      │ ← React + Wagmi + RainbowKit
│   (Your App)    │
└────────┬────────┘
         │
         ├─── Wallet Connection (MetaMask, WalletConnect)
         │
         ├─── Smart Contract Interaction
         │
┌────────▼────────┐
│  Smart Contract │ ← Solidity on Polygon/BSC
│  (Blockchain)   │
└────────┬────────┘
         │
         ├─── Price Oracle (Chainlink)
         │
         └─── Reward Distribution
```

---

## 🔗 **Step 1: Choose Blockchain**

### **Recommended: Polygon (MATIC)**

**Why Polygon:**
- ✅ Low fees: $0.01-0.10 per transaction
- ✅ Fast: 2-second block time
- ✅ Ethereum-compatible (same tools as Ethereum)
- ✅ Large user base
- ✅ Chainlink oracles available

**Alternatives:**

| Chain | Transaction Fee | Speed | Pros | Cons |
|-------|----------------|-------|------|------|
| **Polygon** | $0.01-0.10 | 2s | Cheap, fast, popular | Less decentralized |
| **BSC** | $0.05-0.20 | 3s | Very cheap, traders love it | Centralized |
| **Base** | $0.01-0.05 | 2s | Coinbase backed, growing | New, less tested |
| **Ethereum** | $5-50 | 12s | Most secure, trusted | Expensive |
| **Arbitrum** | $0.10-1 | 1s | Ethereum L2, secure | More complex |

**Decision:** Polygon for this guide (easy to switch later)

---

## 💻 **Step 2: Frontend Wallet Integration**

### **Install Dependencies**

```bash
cd frontend
npm install wagmi viem @tanstack/react-query @rainbow-me/rainbowkit
```

### **Setup Wagmi Config**

Create `frontend/src/config/web3Config.ts`:

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonMumbai } from 'wagmi/chains';

export const web3Config = getDefaultConfig({
  appName: 'Crypto Trading Intelligence',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from walletconnect.com
  chains: [polygon, polygonMumbai], // Production + Testnet
});
```

### **Wrap App with Providers**

Update `frontend/src/main.tsx`:

```typescript
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { web3Config } from './config/web3Config';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={web3Config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Provider store={store}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
```

### **Create Wallet Connect Button**

Create `frontend/src/components/WalletConnect.tsx`:

```typescript
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';

const WalletConnect = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  return (
    <div className="flex items-center gap-4">
      {isConnected && (
        <div className="text-sm">
          <p className="text-muted-foreground">Balance:</p>
          <p className="font-bold text-cyber-green">
            {balance?.formatted} {balance?.symbol}
          </p>
        </div>
      )}

      <ConnectButton
        label="Connect Wallet"
        showBalance={false}
        chainStatus="icon"
      />
    </div>
  );
};

export default WalletConnect;
```

Add to your navbar:

```typescript
import WalletConnect from './components/WalletConnect';

// In navbar component
<WalletConnect />
```

---

## 📜 **Step 3: Smart Contract Development**

### **Option A: Use Hardhat (Recommended)**

Create smart contract project:

```bash
mkdir blockchain
cd blockchain
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

### **Create Prediction Contract**

Create `blockchain/contracts/PricePrediction.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PricePrediction {
    struct Market {
        string symbol;
        uint256 targetPrice;
        uint256 expiryTime;
        uint256 totalUpStake;
        uint256 totalDownStake;
        bool settled;
        int256 finalPrice;
    }

    struct UserPrediction {
        uint256 amount;
        bool predictedUp;
        bool claimed;
    }

    // Market ID => Market details
    mapping(uint256 => Market) public markets;

    // Market ID => User address => Prediction
    mapping(uint256 => mapping(address => UserPrediction)) public predictions;

    uint256 public nextMarketId;
    uint256 public platformFeePercent = 2; // 2% fee
    address public owner;

    // Chainlink price feed
    AggregatorV3Interface internal priceFeed;

    event MarketCreated(uint256 indexed marketId, string symbol, uint256 expiryTime);
    event PredictionMade(uint256 indexed marketId, address indexed user, bool isUp, uint256 amount);
    event MarketSettled(uint256 indexed marketId, int256 finalPrice, uint256 totalPayout);
    event RewardClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    constructor(address _priceFeed) {
        owner = msg.sender;
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function createMarket(
        string memory _symbol,
        uint256 _expiryTime
    ) external {
        require(msg.sender == owner, "Only owner");
        require(_expiryTime > block.timestamp, "Invalid expiry");

        markets[nextMarketId] = Market({
            symbol: _symbol,
            targetPrice: 0,
            expiryTime: _expiryTime,
            totalUpStake: 0,
            totalDownStake: 0,
            settled: false,
            finalPrice: 0
        });

        emit MarketCreated(nextMarketId, _symbol, _expiryTime);
        nextMarketId++;
    }

    function makePrediction(
        uint256 _marketId,
        bool _predictUp
    ) external payable {
        require(msg.value > 0, "Must stake something");
        require(block.timestamp < markets[_marketId].expiryTime, "Market expired");
        require(predictions[_marketId][msg.sender].amount == 0, "Already predicted");

        predictions[_marketId][msg.sender] = UserPrediction({
            amount: msg.value,
            predictedUp: _predictUp,
            claimed: false
        });

        if (_predictUp) {
            markets[_marketId].totalUpStake += msg.value;
        } else {
            markets[_marketId].totalDownStake += msg.value;
        }

        emit PredictionMade(_marketId, msg.sender, _predictUp, msg.value);
    }

    function settleMarket(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        require(block.timestamp >= market.expiryTime, "Not expired yet");
        require(!market.settled, "Already settled");

        // Get price from Chainlink oracle
        (, int256 price, , ,) = priceFeed.latestRoundData();
        market.finalPrice = price;
        market.settled = true;

        emit MarketSettled(_marketId, price, market.totalUpStake + market.totalDownStake);
    }

    function claimReward(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        UserPrediction storage userPred = predictions[_marketId][msg.sender];

        require(market.settled, "Not settled");
        require(userPred.amount > 0, "No prediction");
        require(!userPred.claimed, "Already claimed");

        // Determine if user won
        bool priceWentUp = market.finalPrice > int256(market.targetPrice);
        bool userWon = userPred.predictedUp == priceWentUp;

        if (userWon) {
            uint256 totalPool = market.totalUpStake + market.totalDownStake;
            uint256 winningPool = userPred.predictedUp ? market.totalUpStake : market.totalDownStake;

            // Calculate user's share of the pool
            uint256 userShare = (userPred.amount * totalPool) / winningPool;

            // Subtract platform fee
            uint256 platformFee = (userShare * platformFeePercent) / 100;
            uint256 payout = userShare - platformFee;

            userPred.claimed = true;

            (bool success, ) = msg.sender.call{value: payout}("");
            require(success, "Transfer failed");

            emit RewardClaimed(_marketId, msg.sender, payout);
        } else {
            userPred.claimed = true; // Mark as claimed even if lost
        }
    }

    function getLatestPrice() public view returns (int256) {
        (, int256 price, , ,) = priceFeed.latestRoundData();
        return price;
    }
}
```

### **Deploy Script**

Create `blockchain/scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  // Chainlink BTC/USD price feed on Polygon Mumbai testnet
  const priceFeedAddress = "0x007A22900a3B98143368Bd5906f8E17e9867581b";

  const PricePrediction = await hre.ethers.getContractFactory("PricePrediction");
  const contract = await PricePrediction.deploy(priceFeedAddress);

  await contract.deployed();

  console.log("PricePrediction deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### **Deploy to Polygon Mumbai (Testnet)**

```bash
npx hardhat run scripts/deploy.js --network polygonMumbai
```

---

## 🎨 **Step 4: Prediction UI Component**

Create `frontend/src/components/PricePredictionCard.tsx`:

```typescript
import { useState } from 'react';
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi';
import { parseEther } from 'viem';
import AnimatedButton from './AnimatedButton';
import { TrendingUp, TrendingDown } from 'lucide-react';

const PREDICTION_CONTRACT_ADDRESS = '0x...'; // Your deployed contract
const PREDICTION_ABI = [...]; // Import from contract artifacts

interface PricePredictionCardProps {
  symbol: string;
  currentPrice: number;
  marketId: number;
  expiryTime: number;
}

const PricePredictionCard = ({
  symbol,
  currentPrice,
  marketId,
  expiryTime
}: PricePredictionCardProps) => {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState('0.01');
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | null>(null);

  const { write: makePrediction, isLoading } = useContractWrite({
    address: PREDICTION_CONTRACT_ADDRESS,
    abi: PREDICTION_ABI,
    functionName: 'makePrediction',
  });

  const handlePredict = (direction: 'up' | 'down') => {
    if (!isConnected) {
      alert('Please connect wallet first');
      return;
    }

    makePrediction({
      args: [marketId, direction === 'up'],
      value: parseEther(stakeAmount),
    });
  };

  const timeRemaining = Math.max(0, expiryTime - Date.now());
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="border border-white/10 rounded-lg p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gradient">{symbol}</h3>
          <p className="text-2xl font-bold text-foreground">${currentPrice.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Expires in</p>
          <p className="text-sm font-bold text-cyber-purple">{hours}h {minutes}m</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Stake Amount (MATIC)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AnimatedButton
          onClick={() => handlePredict('up')}
          variant="primary"
          isLoading={isLoading}
          className="bg-gradient-to-r from-cyber-green to-cyber-green/80"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Predict UP
        </AnimatedButton>

        <AnimatedButton
          onClick={() => handlePredict('down')}
          variant="primary"
          isLoading={isLoading}
          className="bg-gradient-to-r from-red-500 to-red-500/80"
        >
          <TrendingDown className="w-4 h-4 mr-2" />
          Predict DOWN
        </AnimatedButton>
      </div>

      {!isConnected && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Connect your wallet to participate
        </p>
      )}
    </div>
  );
};

export default PricePredictionCard;
```

---

## 📊 **Step 5: Backend Integration**

Update your backend to create markets automatically:

### **Add Market Creation Endpoint**

Create `backend/src/routes/prediction.ts`:

```typescript
import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const PREDICTION_CONTRACT_ADDRESS = process.env.PREDICTION_CONTRACT_ADDRESS!;
const PREDICTION_ABI = [...]; // Import ABI

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
const contract = new ethers.Contract(PREDICTION_CONTRACT_ADDRESS, PREDICTION_ABI, wallet);

// GET /api/prediction/markets - Get active markets
router.get('/markets', async (req, res) => {
  try {
    const markets = await prisma.predictionMarket.findMany({
      where: {
        expiryTime: { gt: new Date() },
        settled: false,
      },
    });

    res.json(markets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// POST /api/prediction/create-market - Create new prediction market
router.post('/create-market', async (req, res) => {
  try {
    const { symbol, expiryHours } = req.body;
    const expiryTime = Math.floor(Date.now() / 1000) + (expiryHours * 3600);

    // Create market on blockchain
    const tx = await contract.createMarket(symbol, expiryTime);
    await tx.wait();

    // Save to database
    const market = await prisma.predictionMarket.create({
      data: {
        symbol,
        expiryTime: new Date(expiryTime * 1000),
        contractMarketId: await contract.nextMarketId() - 1,
      },
    });

    res.json(market);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create market' });
  }
});

export default router;
```

### **Auto-Create Markets for Signals**

In your signal generation, automatically create a prediction market:

```typescript
// After creating signal
const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

await axios.post(`${API_URL}/prediction/create-market`, {
  symbol: signal.symbol,
  expiryHours: 24,
});
```

---

## 🔐 **Step 6: Security & Best Practices**

### **Smart Contract Security**

1. **Audit your contract** (Use OpenZeppelin Defender)
2. **Use ReentrancyGuard** to prevent attacks
3. **Add pause mechanism** for emergencies
4. **Test extensively** on testnet first

### **Frontend Security**

1. **Validate inputs** before sending to contract
2. **Show transaction previews** before confirming
3. **Handle failed transactions** gracefully
4. **Rate limit** prediction submissions

### **Backend Security**

1. **Never expose private keys** in code
2. **Use environment variables** for secrets
3. **Monitor contract events** for anomalies
4. **Implement withdrawal limits**

---

## 💰 **Step 7: Monetization Strategy**

### **Revenue Sources**

1. **Platform Fee**: 2-5% of every pool
   - Example: $1000 pool → $20-50 platform fee

2. **Premium Features**:
   - Early access to predictions
   - Higher stake limits
   - Exclusive prediction markets

3. **Token Launch** (Advanced):
   - Create platform token
   - Use for governance
   - Staking rewards

### **Estimated Costs**

| Item | Cost |
|------|------|
| Smart Contract Deployment | $5-50 (one-time) |
| Chainlink Oracle (if used) | $100-500/month |
| RPC Provider (Alchemy/Infura) | Free - $50/month |
| Wallet Connect Project ID | Free |
| Gas for market settlements | $1-10/day |

**Total**: ~$100-600/month

**Break-even**: ~50-300 active users (with 2% fee)

---

## 🚀 **Launch Checklist**

- [ ] Deploy smart contract to testnet
- [ ] Test wallet connection
- [ ] Test making predictions
- [ ] Test settling markets
- [ ] Test claiming rewards
- [ ] Audit smart contract
- [ ] Deploy to mainnet
- [ ] Add legal disclaimer
- [ ] Monitor for bugs
- [ ] Prepare customer support

---

## 📚 **Resources**

- **RainbowKit Docs**: https://rainbowkit.com
- **Wagmi Docs**: https://wagmi.sh
- **Chainlink Price Feeds**: https://docs.chain.link/data-feeds
- **Hardhat Docs**: https://hardhat.org
- **Polygon Docs**: https://docs.polygon.technology

---

## ⚠️ **Legal Considerations**

**Important:** Prediction markets may be regulated as:
- Gambling (requires licenses in many jurisdictions)
- Securities (if token-based rewards)
- Derivatives (financial regulations)

**Recommendations:**
1. Consult a lawyer before launch
2. Add clear Terms of Service
3. Implement KYC if required
4. Restrict access in regulated countries
5. Consider "skill-based" framing vs pure gambling

---

**Ready to implement?** Start with testnet deployment and let me know if you need help with any step!
