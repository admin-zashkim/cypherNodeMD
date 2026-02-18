const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🛡️ Starting bot with protection...');

let botProcess = null;
let restartCount = 0;

function startBot() {
    if (botProcess) {
        botProcess.kill();
    }

    console.log('🚀 Launching bot instance...');
    
    botProcess = spawn('node', ['index.js'], {
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    botProcess.on('exit', (code, signal) => {
        console.log(`❌ Bot process exited with code ${code} signal ${signal}`);
        
        // Don't restart if we're shutting down
        if (signal !== 'SIGTERM') {
            restartCount++;
            const delay = Math.min(restartCount * 2000, 10000);
            console.log(`🔄 Restarting in ${delay/1000}s... (attempt ${restartCount})`);
            setTimeout(startBot, delay);
        }
    });

    botProcess.on('error', (err) => {
        console.error('Process error:', err);
    });
}

// Handle external signals
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, forwarding to bot...');
    if (botProcess) {
        botProcess.kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 1000);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, forwarding to bot...');
    if (botProcess) {
        botProcess.kill('SIGINT');
    }
    setTimeout(() => process.exit(0), 1000);
});

// Start the bot
startBot();

// Keep this process alive
setInterval(() => {
    if (botProcess && botProcess.exitCode === null) {
        console.log('✅ Bot manager running, bot process active');
    }
}, 30000);
