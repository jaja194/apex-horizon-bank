const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'users-db.json');

// Ensure database file existence structure securely
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// Global state map tracking temporary pending check tokens in memory
let activeChecksCircuit = {};

// Helper Functions
function getDatabase() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function saveDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4));
}

// Express System Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'apex-horizon-secure-vault-token-string-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 Hour secure trace session
}));

// Route Guard middleware for handling sensitive core endpoints
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: "Session expired or unauthorized client context." });
    }
    next();
};

// ================= SECURITY GATEWAY ENDPOINTS =================

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName, accountType, initialBalance } = req.body;
    const db = getDatabase();

    if (!email || !password || !fullName || !accountType) {
        return res.status(400).json({ success: false, message: "Missing required profile registry parameters." });
    }

    if (db.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ success: false, message: "Email signature already registered to a core portfolio account." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create an authentic, completely random 10-digit account number route
        const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        
        const newUser = {
            id: `USR-${Math.floor(100000 + Math.random() * 900000)}`,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            fullName: fullName.trim(),
            accountNumber,
            accountType,
            balance: parseFloat(initialBalance) || 0.00,
            investmentPortfolio: 0.00,
            recentTransactions: []
        };

        db.push(newUser);
        saveDatabase(db);
        res.json({ success: true, message: `Vault created successfully! Account Number assigned: ${accountNumber}` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Structural encryption layer registration failure." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const db = getDatabase();
    const user = db.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return res.status(404).json({ success: false, message: "Account signature not tracked on this local engine." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid system clearance credentials." });

    req.session.userId = user.id;
    res.json({ success: true, message: "Authorization complete. Access terminal mapped." });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Terminal detached safely." });
});


// ================= CORE BANKING OPERATIONS =================

app.get('/api/account', requireAuth, (req, res) => {
    const db = getDatabase();
    const user = db.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ message: "User index error." });
    
    const { password, ...safeData } = user;
    res.json(safeData);
});

// Look up account name by account number for transfers (Crash-Proof Version)
app.get('/api/banking/lookup-account', requireAuth, (req, res) => {
    try {
        const { accountNumber } = req.query;
        
        if (!accountNumber || String(accountNumber).trim() === "") {
            return res.status(400).json({ success: false, message: "Account number query missing." });
        }

        const cleanAccNum = String(accountNumber).trim();
        const db = getDatabase();
        
        const targetUser = db.find(u => u && String(u.accountNumber).trim() === cleanAccNum);
        
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Target account number does not exist on this ledger grid." });
        }
        
        if (targetUser.id === req.session.userId) {
            return res.status(400).json({ success: false, message: "Cannot transfer to your own account registry." });
        }

        return res.json({ success: true, fullName: targetUser.fullName });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal ledger lookup engine failure." });
    }
});

// Peer-To-Peer Account Transfer
app.post('/api/banking/transfer', requireAuth, (req, res) => {
    const { targetAccountNumber, amount } = req.body;
    const transferAmount = parseFloat(amount);
    const db = getDatabase();

    const senderIndex = db.findIndex(u => u.id === req.session.userId);
    const receiverIndex = db.findIndex(u => String(u.accountNumber).trim() === String(targetAccountNumber).trim());

    if (receiverIndex === -1) return res.status(404).json({ success: false, message: "Recipient account number not found." });
    if (senderIndex === receiverIndex) return res.status(400).json({ success: false, message: "Cannot transfer to your own account." });
    if (isNaN(transferAmount) || transferAmount <= 0) return res.status(400).json({ success: false, message: "Invalid amount value." });
    
    if (db[senderIndex].balance < transferAmount) {
        return res.status(400).json({ success: false, message: "Insufficient funds for this ledger wire." });
    }

    const txDate = new Date().toISOString().split('T')[0];
    const txTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const transactionId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    // Log for Sender
    db[senderIndex].balance -= transferAmount;
    db[senderIndex].recentTransactions.unshift({
        id: transactionId, 
        type: 'Debit', 
        method: 'P2P Wire Transfer',
        partyName: db[receiverIndex].fullName,
        accountNumber: db[receiverIndex].accountNumber,
        amount: -transferAmount, 
        merchant: `Transfer to ${db[receiverIndex].fullName}`, 
        date: txDate,
        time: txTime
    });

    // Log for Receiver
    db[receiverIndex].balance += transferAmount;
    db[receiverIndex].recentTransactions.unshift({
        id: transactionId, 
        type: 'Credit', 
        method: 'P2P Wire Transfer',
        partyName: db[senderIndex].fullName,
        accountNumber: db[senderIndex].accountNumber,
        amount: transferAmount, 
        merchant: `Received from ${db[senderIndex].fullName}`, 
        date: txDate,
        time: txTime
    });

    saveDatabase(db);
    res.json({ success: true, message: "Funds processed and wired successfully!" });
});

// Let User A (Giver) issue a check and generate a check token
app.post('/api/banking/issue-check', requireAuth, (req, res) => {
    const { amount } = req.body;
    const checkAmount = parseFloat(amount);
    const db = getDatabase();
    const user = db.find(u => u.id === req.session.userId);

    if (isNaN(checkAmount) || checkAmount <= 0) return res.status(400).json({ success: false, message: "Invalid check amount." });
    if (user.balance < checkAmount) return res.status(400).json({ success: false, message: "Insufficient balance to back this check." });

    // Generate a unique 6-digit check token sequence number
    const checkNumber = Math.floor(100000 + Math.random() * 900000).toString();
    
    activeChecksCircuit[checkNumber] = {
        checkNumber,
        giverId: user.id,
        giverName: user.fullName,
        giverAccount: user.accountNumber,
        amount: checkAmount,
        status: 'PENDING'
    };

    res.json({ success: true, checkNumber, message: `Check token issued. Reference Number: ${checkNumber}` });
});

// Look up check details by check number for User B (Receiver)
app.get('/api/banking/lookup-check', requireAuth, (req, res) => {
    const { checkNumber } = req.query;
    if (!checkNumber) return res.status(400).json({ success: false, message: "Missing check token sequence." });
    
    const check = activeChecksCircuit[checkNumber.trim()];

    if (!check) return res.status(404).json({ success: false, message: "Check number not found or invalid." });
    if (check.status === 'REDEEMED') return res.status(400).json({ success: false, message: "This check asset has already been deposited." });
    if (check.giverId === req.session.userId) return res.status(400).json({ success: false, message: "You cannot capture a check you issued yourself." });

    res.json({ success: true, check });
});

// Mobile Check Deposit (Processes verified check token transactions)
app.post('/api/banking/deposit', requireAuth, (req, res) => {
    const { checkNumber } = req.body;
    const db = getDatabase();
    
    const check = activeChecksCircuit[checkNumber ? checkNumber.trim() : ''];
    if (!check || check.status === 'REDEEMED') return res.status(400).json({ success: false, message: "Check tracking lookup processing error." });

    const receiverIndex = db.findIndex(u => u.id === req.session.userId);
    const giverIndex = db.findIndex(u => u.id === check.giverId);

    if (giverIndex === -1) return res.status(404).json({ success: false, message: "Issuer account trace missing." });
    if (db[giverIndex].balance < check.amount) return res.status(400).json({ success: false, message: "Check bounced: Issuer has insufficient funds." });

    const txDate = new Date().toISOString().split('T')[0];
    const txTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    // Debit the Giver (User A)
    db[giverIndex].balance -= check.amount;
    db[giverIndex].recentTransactions.unshift({
        id: txnId,
        type: 'Debit',
        method: 'Check Drawn',
        partyName: db[receiverIndex].fullName,
        accountNumber: db[receiverIndex].accountNumber,
        amount: -check.amount,
        merchant: `Check #${check.checkNumber} Drawn by ${db[receiverIndex].fullName}`,
        date: txDate,
        time: txTime
    });

    // Credit the Receiver (User B)
    db[receiverIndex].balance += check.amount;
    db[receiverIndex].recentTransactions.unshift({
        id: txnId, 
        type: 'Credit', 
        method: 'e-Check Deposit',
        partyName: check.giverName,
        accountNumber: check.giverAccount,
        amount: check.amount, 
        merchant: `e-Check Mobile Deposit #${check.checkNumber}`, 
        date: txDate,
        time: txTime
    });

    check.status = 'REDEEMED';
    delete activeChecksCircuit[checkNumber.trim()]; // Clear memory frame row

    saveDatabase(db);
    res.json({ success: true, message: "Check clear. Inbound tracking allocation confirmed!" });
});

// Capital Portfolio Investment Route
app.post('/api/banking/invest', requireAuth, (req, res) => {
    const { amount } = req.body;
    const investAmount = parseFloat(amount);
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    if (isNaN(investAmount) || investAmount <= 0) return res.status(400).json({ success: false, message: "Invalid allocation asset structure." });
    if (db[userIndex].balance < investAmount) return res.status(400).json({ success: false, message: "Insufficient current core balance." });

    db[userIndex].balance -= investAmount;
    db[userIndex].investmentPortfolio += investAmount;
    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`, 
        type: 'Debit', 
        method: 'Investment Allocation',
        partyName: 'Apex Capital Growth Index', 
        accountNumber: 'PORTFOLIO-SEC',
        amount: -investAmount, 
        merchant: 'Allocation to Growth Index Portfolio', 
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: "Investment portfolio funded successfully." });
});

// Utility Bill Clearance Route
app.post('/api/banking/bill', requireAuth, (req, res) => {
    const { billerName, amount } = req.body;
    const billAmount = parseFloat(amount);
    const db = getDatabase();
    const userIndex = db.findIndex(u => u.id === req.session.userId);

    if (!billerName || isNaN(billAmount) || billAmount <= 0) return res.status(400).json({ success: false, message: "Invalid parameters loaded." });
    if (db[userIndex].balance < billAmount) return res.status(400).json({ success: false, message: "Insufficient current funds balance." });

    db[userIndex].balance -= billAmount;
    db[userIndex].recentTransactions.unshift({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`, 
        type: 'Debit', 
        method: 'Utility Bill Settlement',
        partyName: billerName.trim(), 
        accountNumber: 'UTILITY-CLEAR',
        amount: -billAmount, 
        merchant: `Utility Settlement: ${billerName}`, 
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    });

    saveDatabase(db);
    res.json({ success: true, message: "Utility settlement executed cleanly." });
});

app.use(express.static(path.join(__dirname, 'public')));
const renderPort = process.env.PORT || 3000;

app.listen(renderPort, '0.0.0.0', () => {
    console.log(`⚡ APEX HORIZON SYSTEMS LIVE ON PORT: ${renderPort}`);
});