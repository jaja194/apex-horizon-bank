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

// Global Stateful Simulated Real-World Market Board
const MARKET_BOARD = {
    stocks: [
        { id: 'AAPL', name: 'Apple Inc.', basePrice: 190.00, currentPrice: 190.00 },
        { id: 'TSLA', name: 'Tesla Inc.', basePrice: 195.00, currentPrice: 195.00 },
        { id: 'NVDA', name: 'NVIDIA Corp.', basePrice: 450.00, currentPrice: 450.00 },
        { id: 'AMZN', name: 'Amazon.com Inc.', basePrice: 140.00, currentPrice: 140.00 },
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

// Original Active Verification Check Circuit Dictionary
let activeChecksCircuit = {
    "CHKP-9988": { issuerId: "SYSTEM", amount: 5000.00, status: "ACTIVE" },
    "CHKP-1122": { issuerId: "SYSTEM", amount: 2500.00, status: "ACTIVE" }
};

function simulateMarketFluctuations() {
    ['stocks', 'cryptos', 'bonds', 'mutual_funds'].forEach(category => {
        if (MARKET_BOARD[category]) {
            MARKET_BOARD[category].forEach(asset => {
                const volatility = category === 'cryptos' ? 0.03 : category === 'bonds' ? 0.004 : 0.012;
                const changePercent = (Math.random() - 0.48) * 2 * volatility;
                asset.currentPrice = Math.max(0.01, asset.currentPrice * (1 + changePercent));
            });
        }
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
        return res.status(401).json({ success: false, message: "Unauthorized client session." });
    }
    next();
};

// ================= SECURITY GATEWAY ENDPOINTS =================

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName, accountType, initialBalance } = req.body;
    const db = getDatabase();

    if (!email || !password || !fullName || !accountType) {
        return res.status(400).json({ success: false, message: "Missing profile fields." });
    }

    if (db.some(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ success: false, message: "Email already registered." });
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
            investments: [],
            recentTransactions: []
        };

        db.push(newUser);
        saveDatabase(db);
        res.json({ success: true, message: `Account created successfully! Number: ${accountNumber}` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Registration failure." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const db = getDatabase();
    const user = db.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

    if (!user) return res.status(404).json({ success: false, message: "Account not found." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid credentials." });

    req.session.userId = user.id;
    res.json({ success: true, message: "Authorization complete." });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Session detached." });
});

// ================= BANKING CORE WEB ENDPOINTS =================

app.get('/api/banking/market-board', requireAuth, (req, res) => {
    simulateMarketFluctuations();
    res.json(MARKET_BOARD);
});

app.get('/api/account', requireAuth, (req, res) => {
    simulateMarketFluctuations();
    const db = getDatabase();
    const user = db.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ message: "User index error." });

    let aggregatedCostBasis = 0;
    let aggregatedCurrentWorth = 0;

    const populatedInvestments = (user.investments || []).map(inv => {
        let marketAsset = null;
        for (const cat of ['stocks', 'cryptos', 'bonds', 'mutual_funds']) {
            if (MARKET_BOARD[cat]) {
                const found = MARKET_BOARD[cat].find(a => a.id === inv.assetId);
                if (found) { marketAsset = found; break; }
            }
        }

        const livePrice = marketAsset ? marketAsset.currentPrice : (inv.purchasePrice || 0);
        const currentWorth = (inv.sharesOwned || 0) * livePrice;

        aggregatedCostBasis += (inv.totalCost || 0);
        aggregatedCurrentWorth += currentWorth;

        return {
            ...inv,
            assetName: marketAsset ? marketAsset.name : inv.assetId,
            currentPrice: livePrice,
            currentWorth: currentWorth,
            pnlValue: currentWorth - (inv.totalCost || 0),
            pnlPercent: inv.totalCost > 0 ? ((currentWorth - inv.totalCost) / inv.totalCost) * 100 : 0
        };
    });

    const totalPortfolioPnlValue = aggregatedCurrentWorth - aggregatedCostBasis;
    const totalPortfolioPnlPercent = aggregatedCostBasis > 0 ? (totalPortfolioPnlValue / aggregatedCostBasis) * 100 : 0;

    const { password, ...safeData } = user;
    safeData.investments = populatedInvestments;
    safeData.recentTransactions = user.recentTransactions || [];
    safeData.investmentPortfolioWorth = aggregatedCurrentWorth;
    safeData.portfolioPnlValue = totalPortfolioPnlValue;
    safeData.portfolioPnlPercent = totalPortfolioPnlPercent;

    res.json(safeData);
});

// P2P Lookup & Wire Transfer
app.get('/api/banking/lookup-account', requireAuth, (req, res) => {
    const { accountNumber } = req.query;
    if (!accountNumber) return res.status(400).json({ success: false, message: "Missing parameter." });
    const db = getDatabase();
    const targetUser = db.find(u => String(u.accountNumber).trim() === String(accountNumber).trim());
    if (!targetUser) return res.status(404).json({ success: false, message: "Target account unmatched." });
    if (targetUser.id === req.session.userId) return res.status(400).json({ success: false, message: "Self transfers prohibited." });
    res.json({ success: true, fullName: targetUser.fullName });
});

app.post('/api/banking/transfer', requireAuth, (req, res) => {
    const { targetAccountNumber, amount } = req.body;
    const transferAmount = parseFloat(amount);
    const db = getDatabase();

    const senderIndex = db.findIndex(u => u.id === req.session.userId);
    const receiverIndex = db.findIndex(u => String(u.accountNumber).trim() === String(targetAccountNumber).trim());

    if (receiverIndex === -1 || senderIndex === receiverIndex) return res.status(400).json({ success: false, message: "Account mapping collision." });
    if (isNaN(transferAmount) || transferAmount <= 0) return res.status(400).json({ success: false, message: "Invalid amount input." });
    if (db[senderIndex].balance < transferAmount) return res.status(400).json({ success: false, message: "Insufficient balance." });

    const txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const dStr = new Date().toISOString().split('T')[0];
    const tStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    db[senderIndex].balance -= transferAmount;
    if (!db[senderIndex].recentTransactions) db[senderIndex].recentTransactions = [];
    db[senderIndex].recentTransactions.unshift({ id: txnId, type: 'Debit', method: 'P2P Wire', partyName: db[receiverIndex].fullName, accountNumber: db[receiverIndex].accountNumber, amount: -transferAmount, merchant: `Transfer to ${db[receiverIndex].fullName}`, date: dStr, time: tStr });

    db[receiverIndex].balance += transferAmount;
    if (!db[receiverIndex].recentTransactions) db[receiverIndex].recentTransactions = [];
    db[receiverIndex].recentTransactions.unshift({ id: txnId, type: 'Credit', method: 'P2P Wire', partyName: db[senderIndex].fullName, accountNumber: db[senderIndex].accountNumber, amount: transferAmount, merchant: `Received from ${db[senderIndex].fullName}`, date: dStr, time: tStr });

    saveDatabase(db);
    res.json({ success: true, message: "Wire transfer processed successfully." });
});

// ORIGINAL CHECK DEPOSIT VERIFICATION ENGINE
app.post('/api/banking/deposit', requireAuth, (req, res) => {
    const { checkNumber, amount } = req.body;
    const depositAmount = parseFloat(amount);
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);
    const currentUser = db[userIndex];

    if (!checkNumber || isNaN(depositAmount) || depositAmount <= 0) {
        return res.status(400).json({ success: false, message: "Transaction Denied: Missing validation data parameters." });
    }

    const matchedCheck = activeChecksCircuit[checkNumber.trim()];
    
    if (!matchedCheck || matchedCheck.status !== "ACTIVE") {
        return res.status(400).json({ success: false, message: "Invalid, expired, or unmatched check capture token configuration." });
    }

    if (matchedCheck.amount !== depositAmount) {
        return res.status(400).json({ success: false, message: "Transaction Denied: Deposit amount mismatch with check face value." });
    }

    if (matchedCheck.issuerId === currentUser.id) {
        return res.status(400).json({ success: false, message: "Transaction Denied: Cannot deposit a self-issued clearing token." });
    }

    matchedCheck.status = "REDEEMED";
    currentUser.balance += depositAmount;

    if (!currentUser.recentTransactions) currentUser.recentTransactions = [];
    currentUser.recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Credit',
        method: 'Remote Capture Check',
        partyName: 'e-Check Clearance Node',
        accountNumber: checkNumber.trim(),
        amount: depositAmount,
        merchant: `Deposited Check #${checkNumber.trim()}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: `Check Remote Capture Approved! Added $${depositAmount.toFixed(2)} to wallet liquidity.` });
});

// Investments Allocation Engine
app.post('/api/banking/invest/buy', requireAuth, (req, res) => {
    const { assetId, category, amount } = req.body;
    const buyAmount = parseFloat(amount);
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    if (!assetId || !category || isNaN(buyAmount) || buyAmount <= 0) {
        return res.status(400).json({ success: false, message: "Transaction Denied: Complete all asset configuration values." });
    }

    if (db[userIndex].balance < buyAmount) {
        return res.status(400).json({ success: false, message: "Insufficient liquidity wallet balance." });
    }

    const assetGroup = MARKET_BOARD[category];
    if (!assetGroup) return res.status(400).json({ success: false, message: "Invalid asset category classification." });
    
    const liveAsset = assetGroup.find(a => a.id === assetId);
    if (!liveAsset) return res.status(404).json({ success: false, message: "Asset code lookup missing from server engine boards." });

    const sharesToAcquire = buyAmount / liveAsset.currentPrice;
    db[userIndex].balance -= buyAmount;

    if (!db[userIndex].investments) db[userIndex].investments = [];
    const existingAssetIndex = db[userIndex].investments.findIndex(i => i.assetId === assetId);

    if (existingAssetIndex > -1) {
        const oldInv = db[userIndex].investments[existingAssetIndex];
        const newTotalCost = (oldInv.totalCost || 0) + buyAmount;
        const newSharesCount = (oldInv.sharesOwned || 0) + sharesToAcquire;
        
        db[userIndex].investments[existingAssetIndex] = {
            assetId,
            category,
            sharesOwned: newSharesCount,
            purchasePrice: newTotalCost / newSharesCount,
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

    if (!db[userIndex].recentTransactions) db[userIndex].recentTransactions = [];
    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Debit',
        method: 'Asset Purchase',
        partyName: `${liveAsset.name} (${assetId})`,
        accountNumber: 'MARKET-BUY',
        amount: -buyAmount,
        merchant: `Purchased asset shares of ${assetId}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: `Successfully allocated capital! Purchased ${sharesToAcquire.toFixed(4)} shares of ${assetId}.` });
});

app.post('/api/banking/invest/withdraw', requireAuth, (req, res) => {
    const { assetId } = req.body;
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    if (!db[userIndex].investments) return res.status(404).json({ success: false, message: "Portfolio track empty." });
    const matchIdx = db[userIndex].investments.findIndex(i => i.assetId === assetId);
    if (matchIdx === -1) return res.status(404).json({ success: false, message: "Asset target code not owned." });

    const investmentRecord = db[userIndex].investments[matchIdx];

    let currentLivePrice = investmentRecord.purchasePrice;
    for (const cat of ['stocks', 'cryptos', 'bonds', 'mutual_funds']) {
        if (MARKET_BOARD[cat]) {
            const match = MARKET_BOARD[cat].find(a => a.id === assetId);
            if (match) { currentLivePrice = match.currentPrice; break; }
        }
    }

    const currentLiquidationWorth = (investmentRecord.sharesOwned || 0) * currentLivePrice;

    db[userIndex].investments.splice(matchIdx, 1);
    db[userIndex].balance += currentLiquidationWorth;

    if (!db[userIndex].recentTransactions) db[userIndex].recentTransactions = [];
    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Credit',
        method: 'Portfolio Cash-Out',
        partyName: `Liquidated: ${assetId}`,
        accountNumber: 'CASH-SETTLE',
        amount: currentLiquidationWorth,
        merchant: `Liquidated entire ${assetId} position`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: `Position closed! Returned $${currentLiquidationWorth.toFixed(2)} cash directly to balance.` });
});

// Utility Settlement Node
app.post('/api/banking/bill', requireAuth, (req, res) => {
    const { billerName, amount } = req.body;
    const billAmount = parseFloat(amount);
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    if (!billerName || isNaN(billAmount) || billAmount <= 0) {
        return res.status(400).json({ success: false, message: "Transaction Denied: Provide biller context data values." });
    }

    if (db[userIndex].balance < billAmount) {
        return res.status(400).json({ success: false, message: "Insufficient ledger funds for utility processing." });
    }

    db[userIndex].balance -= billAmount;
    if (!db[userIndex].recentTransactions) db[userIndex].recentTransactions = [];
    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Debit',
        method: 'Utility Settlement',
        partyName: billerName.trim(),
        accountNumber: 'UTILITY-CLEAR',
        amount: -billAmount,
        merchant: `Paid utility bill to ${billerName}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: "Utility settlement authorized and finalized safely." });
});

app.use(express.static(path.join(__dirname, 'public')));
const renderPort = process.env.PORT || 3000;
app.listen(renderPort, '0.0.0.0', () => {
    console.log(`⚡ CORE ENGINE DEPLOYMENT COMPLETED ON PORT: ${renderPort}`);
});