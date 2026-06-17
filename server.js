const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const DB_PATH = path.join(__dirname, 'users-db.json');

// Middleware Configurations
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'apex-horizon-secure-vault-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 Day Session Life
}));

// Safe JSON DB Access Handlers
function loadDatabase() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4));
}

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized access" });
    }
    next();
}

/* ==========================================================================
   20 ASSET LIVE CONFIGURATION MATRIX & MARKET SIMULATION
   ========================================================================== */
const ASSET_REGISTRY = {
    stocks: [
        { name: "Apple Inc. (AAPL)", share: 0.20 },
        { name: "Microsoft Corp. (MSFT)", share: 0.20 },
        { name: "NVIDIA Corp. (NVDA)", share: 0.20 },
        { name: "Amazon.com Inc. (AMZN)", share: 0.20 },
        { name: "Alphabet Inc. (GOOGL)", share: 0.20 }
    ],
    crypto: [
        { name: "Bitcoin (BTC)", share: 0.35 },
        { name: "Ethereum (ETH)", share: 0.25 },
        { name: "Solana (SOL)", share: 0.15 },
        { name: "Ripple (XRP)", share: 0.15 },
        { name: "Cardano (ADA)", share: 0.10 }
    ],
    mutualFunds: [
        { name: "Vanguard S&P 500 ETF (VOO)", share: 0.30 },
        { name: "Invesco QQQ Trust (QQQ)", share: 0.25 },
        { name: "Fidelity Contrafund (FCNTX)", share: 0.15 },
        { name: "Vanguard Total International (VXUS)", share: 0.15 },
        { name: "iShares Core MSCI EAFE (IEFA)", share: 0.15 }
    ],
    bonds: [
        { name: "US 10-Year Treasury Note (US10Y)", share: 0.40 },
        { name: "Vanguard Total Bond Market (BND)", share: 0.20 },
        { name: "iShares Investment Grade Corp (LQD)", share: 0.15 },
        { name: "US Series I Savings Bonds", share: 0.15 },
        { name: "iShares National Muni Bond (MUB)", share: 0.10 }
    ]
};

// Generates independent random yield movements based on typical asset volatility boundaries
function calculateLiveYield(type) {
    let change = 0;
    if (type === 'stocks') change = Math.random() * 10 - 4;       // -4% to +6%
    if (type === 'crypto') change = Math.random() * 26 - 10;      // -10% to +16%
    if (type === 'mutualFunds') change = Math.random() * 5 - 1.5; // -1.5% to +3.5%
    if (type === 'bonds') change = Math.random() * 2.5 - 0.5;     // -0.5% to +2.0%
    return parseFloat(change.toFixed(2));
}

/* ==========================================================================
   BANKING REST ENDPOINTS
   ========================================================================== */

// 1. Process Live Pricing Engine Allocations
app.get('/api/banking/assets', requireAuth, (req, res) => {
    const db = loadDatabase();
    const user = db.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ success: false, message: "User records missing" });

    if (!user.assets) {
        user.assets = { growthInvestments: 0, stableIncome: 0, cashLiquidity: 0 };
    }

    const totalGrowthCapital = user.assets.growthInvestments || 0;
    
    // Core sector structural distribution metrics
    const weights = { stocks: 0.40, crypto: 0.30, mutualFunds: 0.20, bonds: 0.10 };
    const simulatedResponse = {};

    Object.keys(ASSET_REGISTRY).forEach(category => {
        const sectorPool = totalGrowthCapital * weights[category];
        
        simulatedResponse[category] = ASSET_REGISTRY[category].map(asset => {
            const performanceRate = calculateLiveYield(category);
            const initialPrincipal = sectorPool * asset.share;
            const liveValue = initialPrincipal * (1 + performanceRate / 100);

            return {
                name: asset.name,
                baseline: initialPrincipal.toFixed(2),
                currentWorth: liveValue.toFixed(2),
                percentageChange: (performanceRate >= 0 ? '+' : '') + performanceRate.toFixed(2) + '%'
            };
        });
    });

    res.json({
        success: true,
        totalGrowthBalance: totalGrowthCapital.toFixed(2),
        breakdown: simulatedResponse
    });
});

// 2. Fund Asset Allocation Pipeline
app.post('/api/banking/allocate', requireAuth, (req, res) => {
    const { amount, assetType } = req.body;
    let db = loadDatabase();
    const user = db.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ success: false, message: "User profile not found" });

    const allocateAmount = parseFloat(amount);
    if (isNaN(allocateAmount) || allocateAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid numerical allocation value" });
    }

    if (user.balance < allocateAmount) {
        return res.status(400).json({ success: false, message: "Insufficient current account balance" });
    }

    if (!user.assets) user.assets = { growthInvestments: 0, stableIncome: 0, cashLiquidity: 0 };

    user.balance -= allocateAmount;
    user.assets[assetType] = (user.assets[assetType] || 0) + allocateAmount;

    user.recentTransactions.unshift({
        id: "alloc-" + Date.now(),
        type: "Debit",
        amount: allocateAmount,
        merchant: `Asset Allocation: ${assetType}`,
        date: new Date().toISOString().split('T')[0]
    });

    saveDatabase(db);
    res.json({ success: true, balance: user.balance, assets: user.assets });
});

// 3. Asset Liquidation / Withdrawal Stream
app.post('/api/banking/withdraw-asset', requireAuth, (req, res) => {
    const { amount, assetType } = req.body;
    let db = loadDatabase();
    const user = db.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ success: false, message: "User profile not found" });

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid liquidation value input" });
    }

    if (!user.assets || !user.assets[assetType] || user.assets[assetType] < withdrawAmount) {
        return res.status(400).json({ success: false, message: "Requested liquidation exceeds active holdings" });
    }

    user.assets[assetType] -= withdrawAmount;
    user.balance += withdrawAmount;

    user.recentTransactions.unshift({
        id: "with-asset-" + Date.now(),
        type: "Credit",
        amount: withdrawAmount,
        merchant: `Asset Liquidation: ${assetType}`,
        date: new Date().toISOString().split('T')[0]
    });

    saveDatabase(db);
    res.json({ success: true, balance: user.balance, assets: user.assets });
});

// 4. Invoices and Utilities Bill Payment Settlement Terminal
app.post('/api/banking/bill', requireAuth, (req, res) => {
    const { amount, billerName } = req.body;
    let db = loadDatabase();
    const user = db.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ success: false, message: "User profile not found" });

    const billAmount = parseFloat(amount);
    if (isNaN(billAmount) || billAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid invoice volume field input" });
    }

    if (user.balance < billAmount) {
        return res.status(400).json({ success: false, message: "Insufficient current ledger balance" });
    }

    user.balance -= billAmount;
    user.recentTransactions.unshift({
        id: "bill-" + Date.now(),
        type: "Debit",
        amount: billAmount,
        merchant: `Utility Settlement: ${billerName}`,
        date: new Date().toISOString().split('T')[0]
    });

    saveDatabase(db);
    res.json({ success: true, balance: user.balance });
});

/* ==========================================================================
   PORT INITIALIZATION LAYER
   ========================================================================== */
const renderPort = process.env.PORT || 3000;
app.listen(renderPort, '0.0.0.0', () => {
    console.log(`⚡ APEX HORIZON SYSTEMS LIVE ON PORT: ${renderPort}`);
});