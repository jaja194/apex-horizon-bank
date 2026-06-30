const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const DB_FILE = path.join(__dirname, 'users-db.json');

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

let activeChecksCircuit = {};

// Global Active Ticker Matrix Market Assets
let liveMarketEngine = {
    stocks: [
        { id: 'st_apple', name: 'Apple Inc.', ticker: 'AAPL', price: 175.50, volatility: 0.015 },
        { id: 'st_nvidia', name: 'NVIDIA Corporation', ticker: 'NVDA', price: 900.25, volatility: 0.035 },
        { id: 'st_tesla', name: 'Tesla Inc.', ticker: 'TSLA', price: 170.80, volatility: 0.040 },
        { id: 'st_microsoft', name: 'Microsoft Corp.', ticker: 'MSFT', price: 420.10, volatility: 0.012 },
        { id: 'st_amazon', name: 'Amazon.com Inc.', ticker: 'AMZN', price: 180.40, volatility: 0.018 }
    ],
    cryptos: [
        { id: 'cr_bitcoin', name: 'Bitcoin', ticker: 'BTC', price: 65000.00, volatility: 0.060 },
        { id: 'cr_ethereum', name: 'Ethereum', ticker: 'ETH', price: 3500.00, volatility: 0.075 },
        { id: 'cr_solana', name: 'Solana', ticker: 'SOL', price: 145.20, volatility: 0.090 },
        { id: 'cr_ripple', name: 'Ripple', ticker: 'XRP', price: 0.55, volatility: 0.050 },
        { id: 'cr_cardano', name: 'Cardano', ticker: 'ADA', price: 0.45, volatility: 0.065 }
    ],
    bonds: [
        { id: 'bd_us10y', name: 'US 10-Year Treasury Bond', ticker: 'US10Y', price: 98.20, volatility: 0.002 },
        { id: 'bd_corp', name: 'Corporate High-Yield Debt', ticker: 'CORP', price: 102.50, volatility: 0.005 },
        { id: 'bd_muni', name: 'Municipal Tax-Free Bond', ticker: 'MUNI', price: 100.10, volatility: 0.003 },
        { id: 'bd_green', name: 'Green Sustainable Energy Bond', ticker: 'GRNBD', price: 95.75, volatility: 0.004 },
        { id: 'bd_emerge', name: 'Emerging Markets Sovereign Bond', ticker: 'EMBD', price: 88.40, volatility: 0.009 }
    ],
    mutualfunds: [
        { id: 'mf_sp500', name: 'S&P 500 Index Growth Fund', ticker: 'VFIAX', price: 450.60, volatility: 0.008 },
        { id: 'mf_vanguard_tech', name: 'Vanguard Information Tech Fund', ticker: 'VITAX', price: 210.35, volatility: 0.016 },
        { id: 'mf_america', name: 'Growth Fund of America Class A', ticker: 'AGTHX', price: 62.15, volatility: 0.010 },
        { id: 'mf_global_div', name: 'Global Dividend Premium Fund', ticker: 'GDIVX', price: 38.90, volatility: 0.006 },
        { id: 'mf_reit', name: 'Real Estate Investment Trust Index', ticker: 'VGSLX', price: 84.20, volatility: 0.011 }
    ]
};

// BACKGROUND INTERVAL SIMULATION TICKER WITH WEEKLY VOLATILITY REGULATION
setInterval(() => {
    const currentDay = new Date().getDay();
    const isHighVolatilityPeriod = (currentDay === 6 || currentDay === 0);

    Object.keys(liveMarketEngine).forEach(category => {
        liveMarketEngine[category].forEach(asset => {
            const varianceDirection = Math.random() > 0.48 ? 1 : -1;
            
            let operationalVolatility = asset.volatility;
            if (category === 'cryptos' && !isHighVolatilityPeriod) {
                operationalVolatility = asset.volatility * 0.25; 
            }

            const percentageShift = Math.random() * operationalVolatility;
            const absoluteDelta = asset.price * percentageShift * varianceDirection;
            asset.price = Math.max(0.01, asset.price + absoluteDelta);
        });
    });
}, 3000);

function getDatabase() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) || [];
    } catch (e) { return []; }
}

function saveDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'apex-horizon-secure-vault-token-string-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: "Unauthorized. Please log in." });
    }
}

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName, accountType, initialBalance } = req.body;
    const db = getDatabase();

    if (!email || !password || !fullName || !accountType) {
        return res.status(400).json({ success: false, message: "Missing required profile parameters." });
    }
    if (db.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ success: false, message: "Email signature already registered." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        
        const newUser = {
            id: `USR-${Math.floor(100000 + Math.random() * 900000)}`,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            fullName: fullName.trim(),
            accountNumber,
            accountType,
            balance: parseFloat(initialBalance) || 0.00,
            investedAssets: [],
            recentTransactions: []
        };

        db.push(newUser);
        saveDatabase(db);
        res.json({ success: true, message: `Vault created successfully! Account Assigned: ${accountNumber}` });
    } catch (err) { res.status(500).json({ success: false, message: "Encryption registration failure." }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const db = getDatabase();
    const user = db.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return res.status(404).json({ success: false, message: "Account signature not tracked." });
    if (!(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, message: "Invalid clearance credentials." });
    }

    req.session.userId = user.id;
    res.json({ success: true, message: "Authorization complete." });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Terminal detached." });
});

app.get('/api/account', requireAuth, (req, res) => {
    const db = getDatabase();
    const user = db.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ message: "User index error." });

    if (!user.investedAssets || !Array.isArray(user.investedAssets)) {
        user.investedAssets = [];
    }

    user.investedAssets = user.investedAssets.map(heldItem => {
        let matchingAsset = null;
        if (liveMarketEngine && liveMarketEngine[heldItem.assetClass]) {
            matchingAsset = liveMarketEngine[heldItem.assetClass].find(a => a.id === heldItem.assetId);
        }
        
        const livePrice = matchingAsset ? parseFloat(matchingAsset.price) : (parseFloat(heldItem.purchasePrice) || 0);
        const holdUnits = parseFloat(heldItem.amount) || 0;

        return {
            ...heldItem,
            amount: holdUnits,
            purchasePrice: parseFloat(heldItem.purchasePrice) || livePrice,
            currentPrice: livePrice,
            totalValue: parseFloat((holdUnits * livePrice).toFixed(2))
        };
    });

    const { password, ...safeData } = user;
    res.json(safeData);
});

app.get('/api/banking/lookup-account', requireAuth, (req, res) => {
    const { accountNumber } = req.query;
    const db = getDatabase();
    const targetUser = db.find(u => String(u.accountNumber).trim() === String(accountNumber).trim());

    if (!targetUser) return res.status(404).json({ success: false, message: "Target account registry missing." });
    if (targetUser.id === req.session.userId) return res.status(400).json({ success: false, message: "Cannot transfer to self." });

    res.json({ success: true, fullName: targetUser.fullName });
});

app.post('/api/banking/transfer', requireAuth, (req, res) => {
    const { targetAccountNumber, amount } = req.body;
    const transferAmount = parseFloat(amount);
    const db = getDatabase();

    const senderIndex = db.findIndex(u => u.id === req.session.userId);
    const receiverIndex = db.findIndex(u => String(u.accountNumber).trim() === String(targetAccountNumber).trim());

    if (receiverIndex === -1 || senderIndex === -1) return res.status(404).json({ success: false, message: "Routing link breakdown." });
    if (db[senderIndex].balance < transferAmount) return res.status(400).json({ success: false, message: "Insufficient ledger funds balance." });

    const txDate = new Date().toISOString().split('T')[0];
    const txTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const transactionId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    db[senderIndex].balance = parseFloat((db[senderIndex].balance - transferAmount).toFixed(2));
    db[senderIndex].recentTransactions.unshift({
        id: transactionId, type: 'Debit', method: 'P2P Wire Transfer', status: 'Processed',
        partyName: db[receiverIndex].fullName, accountNumber: db[receiverIndex].accountNumber,
        amount: -transferAmount, merchant: `Transfer to ${db[receiverIndex].fullName}`, date: txDate, time: txTime
    });

    db[receiverIndex].balance = parseFloat((db[receiverIndex].balance + transferAmount).toFixed(2));
    db[receiverIndex].recentTransactions.unshift({
        id: transactionId, type: 'Credit', method: 'P2P Wire Transfer', status: 'Processed',
        partyName: db[senderIndex].fullName, accountNumber: db[senderIndex].accountNumber,
        amount: transferAmount, merchant: `Received from ${db[senderIndex].fullName}`, date: txDate, time: txTime
    });

    saveDatabase(db);
    res.json({ success: true, message: "Funds processed and wired successfully!" });
});

app.post('/api/banking/issue-check', requireAuth, (req, res) => {
    const { amount } = req.body;
    const checkAmount = parseFloat(amount);
    const db = getDatabase();
    const user = db.find(u => u.id === req.session.userId);

    if (isNaN(checkAmount) || checkAmount <= 0 || user.balance < checkAmount) {
        return res.status(400).json({ success: false, message: "Invalid asset configuration balance." });
    }

    const checkNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
    activeChecksCircuit[checkNumber] = {
        checkNumber, giverId: user.id, giverName: user.fullName, giverAccount: user.accountNumber, amount: checkAmount, status: 'PENDING'
    };

    res.json({ success: true, checkNumber, message: `Check token issued. Reference Number: ${checkNumber}` });
});

app.get('/api/banking/lookup-check', requireAuth, (req, res) => {
    const check = activeChecksCircuit[req.query.checkNumber ? req.query.checkNumber.trim() : ''];
    if (!check) return res.status(404).json({ success: false, message: "Check variant sequence not found." });
    if (check.giverId === req.session.userId) return res.status(400).json({ success: false, message: "Self capture loop blocked." });

    res.json({ success: true, check });
});

app.post('/api/banking/deposit', requireAuth, (req, res) => {
    const { checkNumber } = req.body;
    const db = getDatabase();
    const check = activeChecksCircuit[checkNumber ? checkNumber.trim() : ''];

    if (!check) return res.status(400).json({ success: false, message: "Check processing error." });

    const receiverIndex = db.findIndex(u => u.id === req.session.userId);
    const giverIndex = db.findIndex(u => u.id === check.giverId);

    if (db[giverIndex].balance < check.amount) return res.status(400).json({ success: false, message: "Check bounce: Insufficient backing ledger balance." });

    const txDate = new Date().toISOString().split('T')[0];
    const txTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    db[giverIndex].balance = parseFloat((db[giverIndex].balance - check.amount).toFixed(2));
    db[giverIndex].recentTransactions.unshift({
        id: txnId, type: 'Debit', method: 'Check Drawn', status: 'Settled',
        partyName: db[receiverIndex].fullName, accountNumber: db[receiverIndex].accountNumber,
        amount: -check.amount, merchant: `Check #${check.checkNumber} Drawn by ${db[receiverIndex].fullName}`, date: txDate, time: txTime
    });

    db[receiverIndex].balance = parseFloat((db[receiverIndex].balance + check.amount).toFixed(2));
    db[receiverIndex].recentTransactions.unshift({
        id: txnId, type: 'Credit', method: 'e-Check Deposit', status: 'Settled',
        partyName: check.giverName, accountNumber: check.giverAccount,
        amount: check.amount, merchant: `e-Check Mobile Deposit #${check.checkNumber}`, date: txDate, time: txTime
    });

    delete activeChecksCircuit[checkNumber.trim()];
    saveDatabase(db);
    res.json({ success: true, message: "Check cleared completely." });
});

app.get('/api/investing/market-assets', requireAuth, (req, res) => {
    res.json(liveMarketEngine);
});

app.post('/api/investing/buy', requireAuth, (req, res) => {
    const { assetClass, assetId, amount } = req.body;
    const db = getDatabase();
    const user = db.find(u => u.id === req.session.userId);

    if (!user) return res.status(404).json({ message: "User session node context missing." });

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: "Invalid purchase allocation amount." });
    }

    if (user.balance < numericAmount) {
        return res.status(400).json({ message: "Insufficient liquid account reserves." });
    }

    if (!user.investedAssets || !Array.isArray(user.investedAssets)) {
        user.investedAssets = [];
    }

    let matchingAsset = null;
    if (liveMarketEngine[assetClass]) {
        matchingAsset = liveMarketEngine[assetClass].find(a => a.id === assetId);
    }

    if (!matchingAsset) {
        return res.status(404).json({ message: "Target ticker asset class index mismatch." });
    }

    user.balance = parseFloat((user.balance - numericAmount).toFixed(2));

    const allocatedUnits = parseFloat((numericAmount / matchingAsset.price).toFixed(6));
    const existingHolding = user.investedAssets.find(a => a.assetId === assetId && a.assetClass === assetClass);
    
    if (existingHolding) {
        const currentUnits = parseFloat(existingHolding.amount) || 0;
        const currentPrice = parseFloat(existingHolding.purchasePrice) || matchingAsset.price;
        
        existingHolding.purchasePrice = parseFloat((((currentPrice * currentUnits) + (matchingAsset.price * allocatedUnits)) / (currentUnits + allocatedUnits)).toFixed(2));
        existingHolding.amount = parseFloat((currentUnits + allocatedUnits).toFixed(6));
    } else {
        user.investedAssets.push({
            assetClass: assetClass,
            assetId: assetId,
            ticker: matchingAsset.ticker,
            name: matchingAsset.name,
            amount: allocatedUnits,
            purchasePrice: parseFloat(matchingAsset.price)
        });
    }

    if (!user.recentTransactions) user.recentTransactions = [];
    user.recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Debit',
        method: 'Asset Allocation',
        status: 'Settled',
        partyName: 'Apex Capital Clearing Desk',
        accountNumber: `BUY-${matchingAsset.ticker}`,
        amount: -numericAmount,
        merchant: `Depl. Capital: ${matchingAsset.name} (${allocatedUnits.toFixed(4)} Units)`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ message: "Core ledger settlement finalized successfully!", balance: user.balance });
});

app.post('/api/investing/withdraw', requireAuth, (req, res) => {
    const { assetId } = req.body;
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    if (userIndex === -1) return res.status(404).json({ success: false, message: "User session node untracked." });

    const assetPosIndex = db[userIndex].investedAssets.findIndex(a => a.assetId === assetId);
    if (assetPosIndex === -1) return res.status(404).json({ success: false, message: "Active holding record not tracked on your account dashboard profile." });

    const position = db[userIndex].investedAssets[assetPosIndex];
    
    let currentSpotAsset = null;
    if (liveMarketEngine[position.assetClass]) {
        currentSpotAsset = liveMarketEngine[position.assetClass].find(a => a.id === assetId);
    }
    
    let liquidationRateSpotPrice = currentSpotAsset ? parseFloat(currentSpotAsset.price) : parseFloat(position.purchasePrice);

    const positionUnits = parseFloat(position.amount) || 0;
    const aggregateLiquidationPayoutVal = parseFloat((positionUnits * liquidationRateSpotPrice).toFixed(2));

    if (isNaN(aggregateLiquidationPayoutVal) || aggregateLiquidationPayoutVal <= 0) {
        return res.status(400).json({ success: false, message: "Liquidation system calculation exception error." });
    }

    db[userIndex].balance = parseFloat((db[userIndex].balance + aggregateLiquidationPayoutVal).toFixed(2));
    db[userIndex].investedAssets.splice(assetPosIndex, 1);

    if (!db[userIndex].recentTransactions) db[userIndex].recentTransactions = [];
    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Credit',
        method: 'Portfolio Liquidation',
        status: 'Settled',
        partyName: 'Apex Capital Clearing Desk',
        accountNumber: `LIQ-${position.ticker}`,
        amount: aggregateLiquidationPayoutVal,
        merchant: `Liquidated All Units of ${position.name || 'Position'}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: `Liquidation processed! Credited back $${aggregateLiquidationPayoutVal.toFixed(2)} into current balance.` });
});

app.post('/api/banking/bill', requireAuth, (req, res) => {
    const { billerName, amount } = req.body;
    const billAmount = parseFloat(amount);
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    if (!billerName || isNaN(billAmount) || billAmount <= 0 || db[userIndex].balance < billAmount) {
        return res.status(400).json({ success: false, message: "Invalid bill execution parameters." });
    }

    db[userIndex].balance = parseFloat((db[userIndex].balance - billAmount).toFixed(2));
    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`, type: 'Debit', method: 'Utility Bill Settlement', status: 'Cleared',
        partyName: billerName.trim(), accountNumber: 'UTILITY-CLEAR', amount: -billAmount, merchant: `Utility Settlement: ${billerName}`,
        date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: "Utility settlement executed cleanly." });
});

app.use(express.static(path.join(__dirname, 'public')));
const renderPort = process.env.PORT || 3000;
app.listen(renderPort, '0.0.0.0', () => {
    console.log(`⚡ APEX HORIZON SYSTEMS LIVE ON PORT: ${renderPort}`);
});