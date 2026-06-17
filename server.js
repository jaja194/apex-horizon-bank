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

// Global Fictional/Simulated Real-World Market Board
const MARKET_BOARD = {
    stocks: [
        { id: 'AAPL', name: 'Apple Inc.', basePrice: 175.00, currentPrice: 175.00 },
        { id: 'TSLA', name: 'Tesla Inc.', basePrice: 220.00, currentPrice: 220.00 },
        { id: 'NVDA', name: 'NVIDIA Corp.', basePrice: 450.00, currentPrice: 450.00 },
        { id: 'AMZN', name: 'Amazon.com Inc.', basePrice: 145.00, currentPrice: 145.00 },
        { id: 'MSFT', name: 'Microsoft Corp.', basePrice: 380.00, currentPrice: 380.00 }
    ],
    cryptos: [
        { id: 'BTC', name: 'Bitcoin', basePrice: 65000.00, currentPrice: 65000.00 },
        { id: 'ETH', name: 'Ethereum', basePrice: 3400.00, currentPrice: 3400.00 },
        { id: 'SOL', name: 'Solana', basePrice: 140.00, currentPrice: 140.00 },
        { id: 'BNB', name: 'BNB', basePrice: 580.00, currentPrice: 580.00 },
        { id: 'XRP', name: 'Ripple XRP', basePrice: 0.55, currentPrice: 0.55 }
    ],
    bonds: [
        { id: 'US10Y', name: 'US 10-Year Treasury Bond', basePrice: 100.00, currentPrice: 100.00 },
        { id: 'CORP-A', name: 'Vanguard Corp Bond ETF', basePrice: 85.00, currentPrice: 85.00 },
        { id: 'MUN-B', name: 'iShares National Muni Bond', basePrice: 110.00, currentPrice: 110.00 },
        { id: 'HIGH-Y', name: 'SPDR High Yield Junk Bond', basePrice: 92.00, currentPrice: 92.00 },
        { id: 'TIP', name: 'TIPS Inflation Protected', basePrice: 105.00, currentPrice: 105.00 }
    ],
    mutual_funds: [
        { id: 'VFIAX', name: 'Vanguard 500 Index Fund', basePrice: 420.00, currentPrice: 420.00 },
        { id: 'VTSAX', name: 'Vanguard Total Stock Market', basePrice: 240.00, currentPrice: 240.00 },
        { id: 'FXAIX', name: 'Fidelity 500 Index Portfolio', basePrice: 165.00, currentPrice: 165.00 },
        { id: 'VWELX', name: 'Vanguard Wellington Balanced', basePrice: 45.00, currentPrice: 45.00 },
        { id: 'AGTHX', name: 'American Funds Growth Fund', basePrice: 62.00, currentPrice: 62.00 }
    ]
};

// Background Market Engine Fluctuation Loop
function simulateMarketFluctuations() {
    ['stocks', 'cryptos', 'bonds', 'mutual_funds'].forEach(category => {
        MARKET_BOARD[category].forEach(asset => {
            // Cryptos change faster than bonds or stocks
            const volatility = category === 'cryptos' ? 0.04 : category === 'bonds' ? 0.005 : 0.015;
            const changePercent = (Math.random() - 0.49) * 2 * volatility; // Slight upward bias
            asset.currentPrice = Math.max(0.01, asset.currentPrice * (1 + changePercent));
        });
    });
}

function getDatabase() {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { return []; }
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

const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized client context." });
    }
    next();
};

// ================= SECURITY GATEWAY ENDPOINTS =================

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName, accountType, initialBalance } = req.body;
    const db = getDatabase();

    if (!email || !password || !fullName || !accountType) {
        return res.status(400).json({ success: false, message: "Missing portfolio configuration fields." });
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
            investments: [], // Sub-ledger for complex purchased wealth assets
            recentTransactions: []
        };

        db.push(newUser);
        saveDatabase(db);
        res.json({ success: true, message: `Account assigned: ${accountNumber}` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Encryption layer registration failure." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const db = getDatabase();
    const user = db.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return res.status(404).json({ success: false, message: "Account not found." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid system clearance credentials." });

    req.session.userId = user.id;
    res.json({ success: true, message: "Authorization complete." });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Terminal detached safely." });
});


// ================= RE-ENGINEERED WEALTH CORE OPERATIONS =================

// Market Pricing Dispatch Node
app.get('/api/banking/market-board', requireAuth, (req, res) => {
    simulateMarketFluctuations(); // Trigger tick fluctuation on UI pull
    res.json(MARKET_BOARD);
});

// Main User Payload Calculator (Dynamic Worth Evaluator)
app.get('/api/account', requireAuth, (req, res) => {
    simulateMarketFluctuations();
    const db = getDatabase();
    const user = db.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ message: "User index error." });

    // Calculate real-time totals on the fly using global market tickers
    let aggregatedCostBasis = 0;
    let aggregatedCurrentWorth = 0;

    const populatedInvestments = user.investments.map(inv => {
        // Find current live price
        let marketAsset = null;
        for (const cat of ['stocks', 'cryptos', 'bonds', 'mutual_funds']) {
            const found = MARKET_BOARD[cat].find(a => a.id === inv.assetId);
            if (found) { marketAsset = found; break; }
        }

        const livePrice = marketAsset ? marketAsset.currentPrice : inv.purchasePrice;
        const currentWorth = inv.sharesOwned * livePrice;

        aggregatedCostBasis += inv.totalCost;
        aggregatedCurrentWorth += currentWorth;

        return {
            ...inv,
            assetName: marketAsset ? marketAsset.name : inv.assetId,
            currentPrice: livePrice,
            currentWorth: currentWorth,
            pnlValue: currentWorth - inv.totalCost,
            pnlPercent: inv.totalCost > 0 ? ((currentWorth - inv.totalCost) / inv.totalCost) * 100 : 0
        };
    });

    const totalPortfolioPnlValue = aggregatedCurrentWorth - aggregatedCostBasis;
    const totalPortfolioPnlPercent = aggregatedCostBasis > 0 ? (totalPortfolioPnlValue / aggregatedCostBasis) * 100 : 0;

    const { password, ...safeData } = user;
    
    // Supplement object structure dynamically
    safeData.investments = populatedInvestments;
    safeData.investmentPortfolioWorth = aggregatedCurrentWorth;
    safeData.portfolioPnlValue = totalPortfolioPnlValue;
    safeData.portfolioPnlPercent = totalPortfolioPnlPercent;

    res.json(safeData);
});

// Update 1 & 4: Asset Purchase Execution Routing
app.post('/api/banking/invest/buy', requireAuth, (req, res) => {
    const { assetId, category, amount } = req.body;
    const buyAmount = parseFloat(amount);
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    // Update #1 Guard validation Check
    if (!assetId || !category || isNaN(buyAmount) || buyAmount <= 0) {
        return res.status(400).json({ success: false, message: "Transaction Denied: You must input an asset amount before allocation." });
    }

    if (db[userIndex].balance < buyAmount) {
        return res.status(400).json({ success: false, message: "Insufficient current cash core balance." });
    }

    const assetGroup = MARKET_BOARD[category];
    if (!assetGroup) return res.status(400).json({ success: false, message: "Target sector registry mapping error." });
    
    const liveAsset = assetGroup.find(a => a.id === assetId);
    if (!liveAsset) return res.status(404).json({ success: false, message: "Asset signature missing from engine ticker." });

    const sharesToAcquire = buyAmount / liveAsset.currentPrice;

    db[userIndex].balance -= buyAmount;

    // Check if user already owns shares of this asset
    const existingAssetIndex = db[userIndex].investments.findIndex(i => i.assetId === assetId);

    if (existingAssetIndex > -1) {
        const oldInv = db[userIndex].investments[existingAssetIndex];
        const newTotalCost = oldInv.totalCost + buyAmount;
        const newSharesCount = oldInv.sharesOwned + sharesToAcquire;
        
        db[userIndex].investments[existingAssetIndex] = {
            assetId,
            category,
            sharesOwned: newSharesCount,
            purchasePrice: newTotalCost / newSharesCount, // Weighted average cost tracking
            totalCost: newTotalCost
        };
    } else {
        db[userIndex].investments.push({
            assetId,
            category,
            sharesOwned: sharesToAcquire,
            purchasePrice: liveAsset.currentPrice,
            totalCost: buyAmount
        });
    }

    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Debit',
        method: 'Asset Acquisition',
        partyName: `${liveAsset.name} (${assetId})`,
        accountNumber: 'MARKET-SECURE',
        amount: -buyAmount,
        merchant: `Allocated capital to ${assetId}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: `Capital Allocation Executed! Acquired ${sharesToAcquire.toFixed(4)} shares of ${assetId}.` });
});

// Update 3: Liquidation / Withdrawal Loop Route
app.post('/api/banking/invest/withdraw', requireAuth, (req, res) => {
    const { assetId } = req.body;
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    const matchIdx = db[userIndex].investments.findIndex(i => i.assetId === assetId);
    if (matchIdx === -1) return res.status(404).json({ success: false, message: "Asset portfolio slice index not tracked." });

    const investmentRecord = db[userIndex].investments[matchIdx];

    // Evaluate live market asset valuation block
    let currentLivePrice = investmentRecord.purchasePrice;
    for (const cat of ['stocks', 'cryptos', 'bonds', 'mutual_funds']) {
        const match = MARKET_BOARD[cat].find(a => a.id === assetId);
        if (match) { currentLivePrice = match.currentPrice; break; }
    }

    const currentLiquidationWorth = investmentRecord.sharesOwned * currentLivePrice;

    // Remove from user sub-ledger arrays entirely
    db[userIndex].investments.splice(matchIdx, 1);
    // Move into cash balance account
    db[userIndex].balance += currentLiquidationWorth;

    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Credit',
        method: 'Asset Liquidation',
        partyName: `Portfolio Sale: ${assetId}`,
        accountNumber: 'CASH-SETTLE',
        amount: currentLiquidationWorth,
        merchant: `Liquidated position: ${assetId} into core vault`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: `Position closed successfully! Recaptured $${currentLiquidationWorth.toFixed(2)} cash asset balance.` });
});

// Update 1: Utility Bill Clearance Route with Form Guards
app.post('/api/banking/bill', requireAuth, (req, res) => {
    const { billerName, amount } = req.body;
    const billAmount = parseFloat(amount);
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    // Update #1 Verification validation Check
    if (!billerName || isNaN(billAmount) || billAmount <= 0) {
        return res.status(400).json({ success: false, message: "Transaction Denied: Both biller classification and settlement amount parameters are mandatory." });
    }

    if (db[userIndex].balance < billAmount) {
        return res.status(400).json({ success: false, message: "Insufficient operational ledger balance." });
    }

    db[userIndex].balance -= billAmount;
    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Debit',
        method: 'Utility Settlement',
        partyName: billerName.trim(),
        accountNumber: 'UTILITY-CLEAR',
        amount: -billAmount,
        merchant: `Settled payment item: ${billerName}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: "Utility payment authorized and recorded successfully." });
});

// P2P Account Lookup
app.get('/api/banking/lookup-account', requireAuth, (req, res) => {
    const { accountNumber } = req.query;
    if (!accountNumber) return res.status(400).json({ success: false, message: "Query parameter missing." });
    const db = getDatabase();
    const targetUser = db.find(u => String(u.accountNumber).trim() === String(accountNumber).trim());
    if (!targetUser) return res.status(404).json({ success: false, message: "Target account registry unmatched." });
    if (targetUser.id === req.session.userId) return res.status(400).json({ success: false, message: "Self loops prohibited." });
    res.json({ success: true, fullName: targetUser.fullName });
});

// Peer-To-Peer Wire
app.post('/api/banking/transfer', requireAuth, (req, res) => {
    const { targetAccountNumber, amount } = req.body;
    const transferAmount = parseFloat(amount);
    const db = getDatabase();

    const senderIndex = db.findIndex(u => u.id === req.session.userId);
    const receiverIndex = db.findIndex(u => String(u.accountNumber).trim() === String(targetAccountNumber).trim());

    if (receiverIndex === -1 || senderIndex === receiverIndex) return res.status(400).json({ success: false, message: "Account wire sequence collision." });
    if (isNaN(transferAmount) || transferAmount <= 0) return res.status(400).json({ success: false, message: "Invalid decimal amount parsing format." });
    if (db[senderIndex].balance < transferAmount) return res.status(400).json({ success: false, message: "Insufficient wire balance structure." });

    const txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const dStr = new Date().toISOString().split('T')[0];
    const tStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    db[senderIndex].balance -= transferAmount;
    db[senderIndex].recentTransactions.unshift({ id: txnId, type: 'Debit', method: 'P2P Wire', partyName: db[receiverIndex].fullName, accountNumber: db[receiverIndex].accountNumber, amount: -transferAmount, merchant: `Transfer to ${db[receiverIndex].fullName}`, date: dStr, time: tStr });

    db[receiverIndex].balance += transferAmount;
    db[receiverIndex].recentTransactions.unshift({ id: txnId, type: 'Credit', method: 'P2P Wire', partyName: db[senderIndex].fullName, accountNumber: db[senderIndex].accountNumber, amount: transferAmount, merchant: `Received from ${db[senderIndex].fullName}`, date: dStr, time: tStr });

    saveDatabase(db);
    res.json({ success: true, message: "Peer wire completed safely." });
});

app.use(express.static(path.join(__dirname, 'public')));
const renderPort = process.env.PORT || 3000;
app.listen(renderPort, '0.0.0.0', () => {
    console.log(`⚡ APEX CORE ENGINE LIVE ON PORT: ${renderPort}`);
});