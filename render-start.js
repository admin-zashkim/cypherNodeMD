const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('='.repeat(50));
console.log('🛡️ CYPHER NODE BOT PROTECTOR');
console.log('='.repeat(50));

let botProcess = null;
let restartCount = 0;
const MAX_RESTARTS = 50;
const START_TIME = Date.now();

// Simple HTTP server for Render health checks
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'alive',
            bot: botProcess && botProcess.exitCode === null ? 'running' : 'restarting',
            uptime: Math.floor((Date.now() - START_TIME) / 1000),
            restarts: restartCount
        }));
    } else {
        res.writeHead(200);
        res.end('Cypher Node Bot Running');
    }
});

server.listen(process.env.PORT || 10000, '0.0.0.0', () => {
    console.log(`🌐 Health check server running on port ${process.env.PORT || 10000}`);
});

function startBot() {
    if (botProcess && botProcess.exitCode === null) {
        console.log('✅ Bot already running');
        return;
    }

    console.log(`\n🚀 Starting bot instance #${restartCount + 1}...`);
    
    // Use optimized Node flags
    const bot = spawn('node', [
        '--max-old-space-size=512',
        '--optimize-for-size',
        '--gc-interval=100',
        'index.js'
    ], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { 
            ...process.env, 
            FORCE_COLOR: 'true',
            NODE_OPTIONS: '--max-old-space-size=512'
        }
    });

    bot.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    bot.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    bot.on('exit', (code, signal) => {
        const uptime = Math.floor((Date.now() - START_TIME) / 1000);
        console.log(`\n❌ Bot process exited - Code: ${code}, Signal: ${signal}, Uptime: ${uptime}s`);
        
        // Don't restart if we're shutting down
        if (signal === 'SIGTERM') {
            console.log('👋 Shutting down...');
            setTimeout(() => process.exit(0), 1000);
            return;
        }

        restartCount++;
        
        if (restartCount > MAX_RESTARTS) {
            console.log('⚠️ Too many restarts, waiting 5 minutes...');
            setTimeout(() => {
                restartCount = 0;
                startBot();
            }, 300000);
        } else {
            const delay = Math.min(restartCount * 2000, 30000);
            console.log(`🔄 Restarting in ${delay/1000}s... (attempt ${restartCount}/${MAX_RESTARTS})`);
            setTimeout(startBot, delay);
        }
    });

    bot.on('error', (err) => {
        console.error('❌ Process error:', err);
    });

    botProcess = bot;
}

// Handle signals
process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM');
    if (botProcess) {
        botProcess.kill('SIGTERM');
    } else {
        process.exit(0);
    }
});

process.on('SIGINT', () => {
    console.log('📡 Received SIGINT');
    if (botProcess) {
        botProcess.kill('SIGINT');
    } else {
        process.exit(0);
    }
});

// Keep-alive
setInterval(() => {
    if (botProcess && botProcess.exitCode === null) {
        console.log(`💓 Heartbeat - Uptime: ${Math.floor((Date.now() - START_TIME) / 60)}m, Restarts: ${restartCount}`);
    }
}, 300000);

// Start the bot
startBot();
