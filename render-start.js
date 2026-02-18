const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

console.log('='.repeat(50));
console.log('🛡️ CYPHER NODE BOT PROTECTOR - FINAL FIX');
console.log('='.repeat(50));

const LOCK_FILE = path.join(__dirname, '.bot.lock');
const PID_FILE = path.join(__dirname, '.bot.pid');
const SESSION_DIR = path.join(__dirname, 'session');
const PORT = process.env.PORT || 10000;

// Kill any existing bot processes
function cleanupExisting() {
    console.log('🔍 Checking for existing bot processes...');
    
    try {
        // Kill any node processes running index.js
        const { execSync } = require('child_process');
        try {
            execSync('pkill -f "node.*index.js" || true');
            console.log('✅ Killed existing bot processes');
        } catch (e) {}
        
        // Remove lock file
        if (fs.existsSync(LOCK_FILE)) {
            fs.unlinkSync(LOCK_FILE);
            console.log('✅ Removed old lock file');
        }
        
        // Remove PID file
        if (fs.existsSync(PID_FILE)) {
            fs.unlinkSync(PID_FILE);
        }
        
        // Wait a moment for processes to die
        setTimeout(() => {}, 2000);
    } catch (err) {
        console.log('⚠️ Cleanup warning:', err.message);
    }
}

// Write PID file
fs.writeFileSync(PID_FILE, process.pid.toString());
console.log(`📝 Protector PID: ${process.pid}`);

// Simple HTTP server for Render health checks
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'alive',
            protector: 'running',
            pid: process.pid,
            timestamp: Date.now()
        }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <head><title>Cypher Node</title></head>
                <body>
                    <h1>Cypher Node Bot</h1>
                    <p>Protector PID: ${process.pid}</p>
                    <p>Status: Running</p>
                    <p>Uptime: ${Math.floor(process.uptime())}s</p>
                </body>
            </html>
        `);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP server running on port ${PORT}`);
});

// Cleanup on startup
cleanupExisting();

// Create a flag file to indicate we're running
fs.writeFileSync(LOCK_FILE, process.pid.toString());

let botProcess = null;
let restartCount = 0;
const MAX_RESTARTS = 10;
const START_TIME = Date.now();

function startBot() {
    if (botProcess && botProcess.exitCode === null) {
        console.log('✅ Bot already running');
        return;
    }

    console.log(`\n🚀 Starting bot instance #${restartCount + 1}...`);
    
    // Check if session exists and is valid
    const credsFile = path.join(SESSION_DIR, 'creds.json');
    if (fs.existsSync(credsFile)) {
        console.log('📁 Session found, will use existing credentials');
    } else {
        console.log('🆕 No session found, will request pairing code');
    }
    
    // Use spawn with detached option to prevent parent-child issues
    const bot = spawn('node', [
        '--max-old-space-size=512',
        '--optimize-for-size',
        '--gc-interval=100',
        'index.js'
    ], {
        detached: false,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { 
            ...process.env, 
            FORCE_COLOR: 'true',
            NODE_OPTIONS: '--max-old-space-size=512'
        }
    });

    let lastActivity = Date.now();
    
    bot.stdout.on('data', (data) => {
        process.stdout.write(data);
        lastActivity = Date.now();
        
        // Check for successful connection message
        const output = data.toString();
        if (output.includes('Connected to =>')) {
            console.log('🎉 Bot connected successfully!');
        }
    });

    bot.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    bot.on('exit', (code, signal) => {
        const uptime = Math.floor((Date.now() - START_TIME) / 1000);
        console.log(`\n❌ Bot process exited - Code: ${code}, Signal: ${signal}`);
        
        // Check if it was a normal exit
        if (code === 0) {
            console.log('✅ Bot exited normally');
            return;
        }
        
        // Don't restart if we're shutting down
        if (signal === 'SIGTERM' || signal === 'SIGINT') {
            console.log('👋 Shutting down...');
            return;
        }

        restartCount++;
        
        if (restartCount > MAX_RESTARTS) {
            console.log('⚠️ Too many restarts, cooling down for 5 minutes...');
            setTimeout(() => {
                restartCount = 0;
                startBot();
            }, 300000);
        } else {
            // Exponential backoff
            const delay = Math.min(5000 * Math.pow(1.5, restartCount - 1), 30000);
            console.log(`🔄 Restarting in ${Math.round(delay/1000)}s... (attempt ${restartCount}/${MAX_RESTARTS})`);
            
            // Clean up any stale sessions
            setTimeout(() => {
                try {
                    // Kill any remaining node processes
                    require('child_process').execSync('pkill -f "node.*index.js" || true');
                } catch (e) {}
                startBot();
            }, delay);
        }
    });

    bot.on('error', (err) => {
        console.error('❌ Process error:', err);
        restartCount++;
        setTimeout(startBot, 10000);
    });

    botProcess = bot;
    
    // Monitor for inactivity (bot might be stuck)
    const monitor = setInterval(() => {
        if (bot.exitCode !== null) {
            clearInterval(monitor);
            return;
        }
        
        const now = Date.now();
        if (now - lastActivity > 120000) { // 2 minutes no output
            console.log('⚠️ No activity for 2 minutes, restarting bot...');
            bot.kill('SIGTERM');
            clearInterval(monitor);
        }
    }, 30000);
}

// Handle signals
process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM - cleaning up...');
    if (botProcess) {
        botProcess.kill('SIGTERM');
    }
    // Remove lock file
    try { fs.unlinkSync(LOCK_FILE); } catch (e) {}
    try { fs.unlinkSync(PID_FILE); } catch (e) {}
    setTimeout(() => process.exit(0), 1000);
});

process.on('SIGINT', () => {
    console.log('📡 Received SIGINT - cleaning up...');
    if (botProcess) {
        botProcess.kill('SIGINT');
    }
    // Remove lock file
    try { fs.unlinkSync(LOCK_FILE); } catch (e) {}
    try { fs.unlinkSync(PID_FILE); } catch (e) {}
    setTimeout(() => process.exit(0), 1000);
});

// Keep-alive and monitoring
setInterval(() => {
    if (botProcess && botProcess.exitCode === null) {
        console.log(`💓 Heartbeat - Uptime: ${Math.floor((Date.now() - START_TIME) / 60)}m, Restarts: ${restartCount}`);
    }
    
    // Check if lock file exists (prevent multiple protectors)
    try {
        const lockPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'));
        if (lockPid !== process.pid && !isNaN(lockPid)) {
            // Check if that process is still running
            try {
                process.kill(lockPid, 0);
                console.log(`⚠️ Another protector running with PID ${lockPid}, exiting...`);
                process.exit(0);
            } catch (e) {
                // Process doesn't exist, we can take over
                fs.writeFileSync(LOCK_FILE, process.pid.toString());
            }
        }
    } catch (e) {
        fs.writeFileSync(LOCK_FILE, process.pid.toString());
    }
}, 60000);

// Start the bot
startBot();
