/**
 * 𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 ✅ - A WhatsApp Bot
 * Copyright (c) 2024 Professor
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 * 
 * Credits:
 * - Baileys Library by @adiwajshing
 * - Pair Code implementation inspired by TechGod143 & DGXEON
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

// ---------- Web Server for Pairing ----------
const express = require('express');
const bodyParser = require('body-parser');

let webServer = null;
let pairingCodePromise = null;
let pendingPhoneNumber = null;

function startWebServer() {
    if (webServer) return;

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.get('/', (req, res) => {
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CYPHER NODE MD - Pairing</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Space Grotesk', sans-serif;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2f 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            position: relative;
            overflow-x: hidden;
        }

        /* Animated background grid */
        .grid-background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: gridMove 20s linear infinite;
            pointer-events: none;
        }

        @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }

        /* Floating particles */
        .particle {
            position: fixed;
            width: 4px;
            height: 4px;
            background: rgba(0, 255, 255, 0.3);
            border-radius: 50%;
            pointer-events: none;
            animation: float 15s infinite;
        }

        @keyframes float {
            0% { transform: translateY(100vh) scale(1); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }

        .container {
            background: rgba(20, 20, 35, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 255, 255, 0.2);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.4),
                0 0 20px rgba(0, 255, 255, 0.2),
                inset 0 0 20px rgba(0, 255, 255, 0.05);
            width: 90%;
            max-width: 440px;
            text-align: center;
            position: relative;
            z-index: 10;
            animation: containerGlow 3s ease-in-out infinite;
        }

        @keyframes containerGlow {
            0%, 100% { box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 255, 255, 0.2); }
            50% { box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.4); }
        }

        /* Cyberpunk corner accents */
        .corner {
            position: absolute;
            width: 30px;
            height: 30px;
            border: 2px solid #00ffff;
            filter: drop-shadow(0 0 5px #00ffff);
        }

        .corner-tl {
            top: 10px;
            left: 10px;
            border-right: none;
            border-bottom: none;
            animation: cornerPulse 2s infinite;
        }

        .corner-tr {
            top: 10px;
            right: 10px;
            border-left: none;
            border-bottom: none;
            animation: cornerPulse 2s infinite 0.5s;
        }

        .corner-bl {
            bottom: 10px;
            left: 10px;
            border-right: none;
            border-top: none;
            animation: cornerPulse 2s infinite 1s;
        }

        .corner-br {
            bottom: 10px;
            right: 10px;
            border-left: none;
            border-top: none;
            animation: cornerPulse 2s infinite 1.5s;
        }

        @keyframes cornerPulse {
            0%, 100% { opacity: 0.5; width: 30px; height: 30px; }
            50% { opacity: 1; width: 35px; height: 35px; }
        }

        /* Bot header with glitch effect */
        .bot-header {
            margin-bottom: 30px;
            position: relative;
        }

        .bot-name {
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #00ffff;
            text-shadow: 
                0 0 10px rgba(0, 255, 255, 0.5),
                0 0 20px rgba(0, 255, 255, 0.3),
                2px 2px 0 #ff00ff,
                -2px -2px 0 #00ffff;
            animation: glitch 3s infinite;
            margin-bottom: 8px;
        }

        @keyframes glitch {
            0%, 100% { transform: skew(0deg); }
            95% { transform: skew(0deg); }
            96% { transform: skew(5deg); }
            97% { transform: skew(-5deg); }
            98% { transform: skew(2deg); }
        }

        .bot-subtitle {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: 3px;
            text-transform: uppercase;
            position: relative;
            display: inline-block;
        }

        .bot-subtitle::before,
        .bot-subtitle::after {
            content: '';
            position: absolute;
            width: 20px;
            height: 2px;
            background: #00ffff;
            top: 50%;
            animation: linePulse 2s infinite;
        }

        .bot-subtitle::before {
            left: -30px;
        }

        .bot-subtitle::after {
            right: -30px;
        }

        @keyframes linePulse {
            0%, 100% { opacity: 0.3; width: 20px; }
            50% { opacity: 1; width: 30px; }
        }

        .input-group {
            margin-bottom: 24px;
            text-align: left;
            position: relative;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #a0a0ff;
            font-size: 14px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .input-icon {
            position: absolute;
            left: 12px;
            color: #00ffff;
            font-size: 20px;
            opacity: 0.5;
            transition: opacity 0.3s;
        }

        input {
            width: 100%;
            padding: 14px 14px 14px 45px;
            background: rgba(10, 10, 20, 0.8);
            border: 2px solid rgba(0, 255, 255, 0.3);
            border-radius: 12px;
            font-size: 16px;
            color: #ffffff;
            font-family: 'Space Grotesk', monospace;
            transition: all 0.3s ease;
        }

        input:hover {
            border-color: rgba(0, 255, 255, 0.6);
            background: rgba(15, 15, 25, 0.9);
        }

        input:focus {
            border-color: #00ffff;
            background: rgba(20, 20, 30, 0.95);
            outline: none;
            box-shadow: 
                0 0 20px rgba(0, 255, 255, 0.3),
                inset 0 0 10px rgba(0, 255, 255, 0.1);
        }

        input:focus + .input-icon {
            opacity: 1;
            transform: scale(1.1);
        }

        .phone-preview {
            position: absolute;
            right: 12px;
            color: rgba(0, 255, 255, 0.3);
            font-size: 12px;
            pointer-events: none;
        }

        button {
            background: linear-gradient(135deg, #00ffff 0%, #ff00ff 100%);
            color: #000;
            border: none;
            padding: 16px 20px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            position: relative;
            overflow: hidden;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-family: 'Space Grotesk', sans-serif;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }

        button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0, 255, 255, 0.4);
        }

        button:hover::before {
            left: 100%;
        }

        button:active {
            transform: translateY(0);
        }

        .loading {
            display: none;
            margin: 30px 0;
        }

        .loader {
            display: inline-block;
            width: 50px;
            height: 50px;
            border: 3px solid rgba(0, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: #00ffff;
            border-bottom-color: #ff00ff;
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 15px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .dots {
            display: inline-block;
            margin-left: 5px;
        }

        .dots span {
            opacity: 0;
            animation: dotPulse 1.4s infinite;
            font-size: 24px;
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff;
        }

        .dots span:nth-child(1) { animation-delay: 0s; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dotPulse {
            0% { opacity: 0; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
            100% { opacity: 0; transform: scale(1); }
        }

        .code-box {
            background: linear-gradient(135deg, #0a0a1a, #1a1a2a);
            border: 2px solid;
            border-image: linear-gradient(135deg, #00ffff, #ff00ff) 1;
            border-radius: 16px;
            padding: 25px;
            margin: 25px 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 6px;
            color: #00ffff;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
            position: relative;
            overflow: hidden;
            animation: codeGlow 2s infinite;
        }

        @keyframes codeGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
            50% { box-shadow: 0 0 40px rgba(255, 0, 255, 0.3); }
        }

        .code-box::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, 
                transparent 30%, 
                rgba(0, 255, 255, 0.1) 50%, 
                transparent 70%);
            animation: codeScan 3s linear infinite;
        }

        @keyframes codeScan {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .copy-btn {
            background: transparent;
            border: 2px solid #00ffff;
            color: #00ffff;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 2px;
            position: relative;
            overflow: hidden;
            box-shadow: none;
            width: auto;
        }

        .copy-btn:hover {
            background: #00ffff;
            color: #000;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        }

        .error {
            color: #ff00ff;
            margin-top: 15px;
            padding: 10px;
            border: 1px solid rgba(255, 0, 255, 0.3);
            border-radius: 8px;
            background: rgba(255, 0, 255, 0.1);
            animation: errorPulse 2s infinite;
        }

        @keyframes errorPulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
        }

        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
            letter-spacing: 1px;
            position: relative;
            padding-top: 20px;
        }

        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 25%;
            width: 50%;
            height: 1px;
            background: linear-gradient(90deg, transparent, #00ffff, #ff00ff, #00ffff, transparent);
            animation: lineMove 3s infinite;
        }

        @keyframes lineMove {
            0% { opacity: 0.3; }
            50% { opacity: 1; }
            100% { opacity: 0.3; }
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            background: rgba(0, 255, 255, 0.1);
            border: 1px solid #00ffff;
            border-radius: 20px;
            font-size: 12px;
            color: #00ffff;
            margin-bottom: 20px;
            animation: badgePulse 2s infinite;
        }

        @keyframes badgePulse {
            0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.2); }
            50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.4); }
        }
    </style>
</head>
<body>
    <!-- Animated background -->
    <div class="grid-background"></div>
    
    <!-- Floating particles -->
    <script>
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (10 + Math.random() * 20) + 's';
            document.body.appendChild(particle);
        }
    </script>

    <!-- Cyberpunk corner accents -->
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>

    <div class="container" id="app">
        <div class="bot-header">
            <h1 class="bot-name">CYPHER NODE MD</h1>
            <div class="status-badge">⚡ SYSTEM ONLINE ⚡</div>
            <div class="bot-subtitle">SECURE PAIRING PORTAL</div>
        </div>

        <p style="color: #a0a0ff; margin-bottom: 25px; font-size: 14px;">Enter your number with country code to initialize connection</p>
        
        <div id="form-view">
            <div class="input-group">
                <label for="phone">📱 PHONE NUMBER</label>
                <div class="input-wrapper">
                    <span class="input-icon">📞</span>
                    <input type="tel" id="phone" placeholder="254xxxxxxxxx" value="254787482014">
                    <span class="phone-preview">without +</span>
                </div>
            </div>
            <button onclick="submitNumber()">
                <span>⟫ INITIALIZE CONNECTION ⟪</span>
            </button>
        </div>

        <div id="loading-view" class="loading">
            <div class="loader"></div>
            <p style="color: #00ffff; margin: 10px 0;">ESTABLISHING SECURE CONNECTION</p>
            <div class="dots">
                <span>.</span><span>.</span><span>.</span>
            </div>
        </div>

        <div id="code-view" style="display:none;">
            <p style="color: #00ffff; margin-bottom: 10px;">🔐 YOUR PAIRING CODE</p>
            <div class="code-box" id="pairCode"></div>
            <button class="copy-btn" onclick="copyCode()">
                <span>📋 COPY TO CLIPBOARD</span>
            </button>
            <p class="info" style="margin-top: 20px; color: #ff00ff;">CODE: YUPRADEV</p>
            <p style="margin-top: 20px; font-size: 13px; color: #a0a0ff;">
                Open WhatsApp → Settings → Linked Devices → Link a Device
            </p>
        </div>

        <div id="error-view" class="error" style="display:none;"></div>
        
        <div class="footer">
            <span>⚡ POWERED BY DAVID CYRIL TECH ⚡</span>
        </div>
    </div>

    <script>
        async function submitNumber() {
            const phone = document.getElementById('phone').value.trim().replace(/[^0-9]/g, '');
            if (!phone) {
                alert('Please enter a valid phone number');
                return;
            }
            if (phone.length < 10) {
                alert('Number must be at least 10 digits');
                return;
            }

            document.getElementById('form-view').style.display = 'none';
            document.getElementById('loading-view').style.display = 'block';
            document.getElementById('code-view').style.display = 'none';
            document.getElementById('error-view').style.display = 'none';

            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: phone })
                });
                const data = await response.json();
                document.getElementById('loading-view').style.display = 'none';
                
                if (data.success) {
                    document.getElementById('pairCode').innerText = data.code;
                    document.getElementById('code-view').style.display = 'block';
                } else {
                    document.getElementById('error-view').innerText = '⚠️ ' + data.error;
                    document.getElementById('error-view').style.display = 'block';
                    document.getElementById('form-view').style.display = 'block';
                }
            } catch (err) {
                document.getElementById('loading-view').style.display = 'none';
                document.getElementById('error-view').innerText = '⚠️ NETWORK ERROR - PLEASE TRY AGAIN';
                document.getElementById('error-view').style.display = 'block';
                document.getElementById('form-view').style.display = 'block';
            }
        }

        function copyCode() {
            const code = document.getElementById('pairCode').innerText;
            navigator.clipboard.writeText(code).then(() => {
                const btn = document.querySelector('.copy-btn');
                const originalText = btn.innerHTML;
                btn.innerHTML = '✓ COPIED!';
                btn.style.background = '#00ffff';
                btn.style.color = '#000';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = 'transparent';
                    btn.style.color = '#00ffff';
                }, 2000);
            }).catch(() => {
                alert('❌ Manual copy failed. Please select and copy the code.');
            });
        }

        // Add cool typing effect to placeholder
        const input = document.getElementById('phone');
        const placeholders = ['254787482014', '23490665xxxx', '15551234567'];
        let index = 0;
        
        setInterval(() => {
            if (document.activeElement !== input) {
                input.placeholder = placeholders[index];
                index = (index + 1) % placeholders.length;
            }
        }, 2000);
    </script>
</body>
</html>
        `);
    });

    app.post('/generate', async (req, res) => {
        let phoneNumber = req.body.phoneNumber || req.body.phone;
        if (!phoneNumber) {
            return res.json({ success: false, error: 'Phone number is required' });
        }

        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        const pn = require('awesome-phonenumber');
        if (!pn('+' + phoneNumber).isValid()) {
            return res.json({ success: false, error: 'Invalid phone number format. Include country code without + or spaces.' });
        }

        pendingPhoneNumber = phoneNumber;
        
        // Create a promise that will be resolved with the pairing code
        pairingCodePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Pairing code generation timeout'));
            }, 60000);

            // Store resolve/reject functions globally
            global.resolvePairing = (code) => {
                clearTimeout(timeout);
                resolve(code);
            };
            global.rejectPairing = (err) => {
                clearTimeout(timeout);
                reject(err);
            };
        });

        try {
            const code = await pairingCodePromise;
            const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
            res.json({ success: true, code: formattedCode });
        } catch (err) {
            console.error('Pairing code error:', err);
            res.json({ success: false, error: err.message || 'Failed to generate code' });
        } finally {
            pendingPhoneNumber = null;
            pairingCodePromise = null;
            delete global.resolvePairing;
            delete global.rejectPairing;
        }
    });

    webServer = app.listen(PORT, () => {
        console.log(chalk.green(`🌐 Web pairing interface running at http://localhost:${PORT}`));
    });

    webServer.on('error', (err) => {
        console.error(chalk.red('Web server error:'), err);
    });
}

function stopWebServer() {
    if (webServer) {
        webServer.close();
        webServer = null;
    }
}
// -----------------------------------------

// Import lightweight store
const store = require('./lib/lightweight_store')

// Initialize store
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Memory optimization - Force garbage collection if available
setInterval(() => {
    if (global.gc) {
        global.gc()
        console.log('🧹 Garbage collection completed')
    }
}, 60_000)
// Memory monitoring - Just warn, don't kill
// Memory monitoring - Just warn and collect garbage, NEVER kill the bot
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log(chalk.yellow(`⚠️ High memory usage: ${used.toFixed(2)}MB - Bot running normally`))
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc()
            console.log(chalk.green('🧹 Manual garbage collection triggered'))
        }
    } else if (used > 300) {
        console.log(chalk.cyan(`📊 Memory usage: ${used.toFixed(2)}MB`))
    }
}, 30_000)

let phoneNumber = "254787482014"
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "Cypher Node MD Admin"
global.themeemoji = "•"
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        return Promise.resolve(settings.ownerNumber || phoneNumber)
    }
}

async function startXeonBotInc() {
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        })

        XeonBotInc.ev.on('creds.update', saveCreds)
        store.bind(XeonBotInc.ev)

        // Message handling
        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate);
                    return;
                }
                if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                    if (!isGroup) return
                }
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

                if (XeonBotInc?.msgRetryCounterCache) {
                    XeonBotInc.msgRetryCounterCache.clear()
                }

                try {
                    await handleMessages(XeonBotInc, chatUpdate, true)
                } catch (err) {
                    console.error("Error in handleMessages:", err)
                    if (mek.key && mek.key.remoteJid) {
                        await XeonBotInc.sendMessage(mek.key.remoteJid, {
                            text: '❌ An error occurred while processing your message.',
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363406579591818@newsletter',
                                    newsletterName: '𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 𝐌𝐃✅',
                                    serverMessageId: -1
                                }
                            }
                        }).catch(console.error);
                    }
                }
            } catch (err) {
                console.error("Error in messages.upsert:", err)
            }
        })

        XeonBotInc.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        XeonBotInc.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = XeonBotInc.decodeJid(contact.id)
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
            }
        })

        XeonBotInc.getName = (jid, withoutContact = false) => {
            let id = XeonBotInc.decodeJid(jid)
            withoutContact = XeonBotInc.withoutContact || withoutContact
            let v
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {}
                if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
            })
            else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
                XeonBotInc.user :
                (store.contacts[id] || {})
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
        }

        XeonBotInc.public = true
        XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

        // Handle pairing code - NOW USING WEB INTERFACE
        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile api')

            // Start web server
            startWebServer()
            console.log(chalk.yellow('📱 Web interface started. Open the URL in your browser to pair.'))
            
            // Wait for phone number from web
            while (!pendingPhoneNumber) {
                await delay(1000)
            }

            let phoneNumber = pendingPhoneNumber
            console.log(chalk.green(`Phone number received: ${phoneNumber}`))

            setTimeout(async () => {
                try {
                    let code = await XeonBotInc.requestPairingCode(phoneNumber)
                    code = code?.match(/.{1,4}/g)?.join("-") || code
                    
                    // Send code back to web interface
                    if (global.resolvePairing) {
                        global.resolvePairing(code)
                    }
                    
                    console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)))
                } catch (error) {
                    console.error('Error requesting pairing code:', error)
                    if (global.rejectPairing) {
                        global.rejectPairing(error)
                    }
                }
            }, 6000)
        }

        // Connection handling
        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s
            
            if (qr) {
                console.log(chalk.yellow('📱 QR Code generated. Please scan with WhatsApp.'))
            }
            
            if (connection === 'connecting') {
                console.log(chalk.yellow('🔄 Connecting to WhatsApp...'))
            }
            
            if (connection == "open") {
                console.log(chalk.magenta(` `))
                console.log(chalk.yellow(`🌿Connected to => ` + JSON.stringify(XeonBotInc.user, null, 2)))

                stopWebServer();

                try {
                    const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
                    await XeonBotInc.sendMessage(botNumber, {
                        text: `🤖 Bot Connected Successfully!\n\n⏰ Time: ${new Date().toLocaleString()}\n✅ Status: Online and Ready!\n\n✅Make sure to join below channel`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363406579591818@newsletter',
                                newsletterName: '𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 𝐌𝐃✅',
                                serverMessageId: -1
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error sending connection message:', error.message)
                }

                await delay(1999)
                console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname || '𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 ✅'} ]`)}\n\n`))
                console.log(chalk.cyan(`< ================================================== >`))
                console.log(chalk.magenta(`\n${global.themeemoji || '•'} YT CHANNEL: 𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 𝐌𝐃✅`))
                console.log(chalk.magenta(`${global.themeemoji || '•'} GITHUB: mrunqiuehacker`))
                console.log(chalk.magenta(`${global.themeemoji || '•'} WA NUMBER: ${owner}`))
                console.log(chalk.magenta(`${global.themeemoji || '•'} CREDIT: 𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 𝐌𝐃✅`))
                console.log(chalk.green(`${global.themeemoji || '•'} 🤖 Bot Connected Successfully! ✅`))
                console.log(chalk.blue(`Bot Version: ${settings.version}`))
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                const statusCode = lastDisconnect?.error?.output?.statusCode
                
                console.log(chalk.red(`Connection closed due to ${lastDisconnect?.error}, reconnecting ${shouldReconnect}`))
                
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try {
                        rmSync('./session', { recursive: true, force: true })
                        console.log(chalk.yellow('Session folder deleted. Please re-authenticate.'))
                    } catch (error) {
                        console.error('Error deleting session:', error)
                    }
                    console.log(chalk.red('Session logged out. Please re-authenticate.'))
                }
                
                if (shouldReconnect) {
                    console.log(chalk.yellow('Reconnecting...'))
                    await delay(5000)
                    startXeonBotInc()
                }
            }
        })

        // Anticall handler
        const antiCallNotified = new Set();

        XeonBotInc.ev.on('call', async (calls) => {
            try {
                const { readState: readAnticallState } = require('./commands/anticall');
                const state = readAnticallState();
                if (!state.enabled) return;
                for (const call of calls) {
                    const callerJid = call.from || call.peerJid || call.chatId;
                    if (!callerJid) continue;
                    try {
                        if (typeof XeonBotInc.rejectCall === 'function' && call.id) {
                            await XeonBotInc.rejectCall(call.id, callerJid);
                        } else if (typeof XeonBotInc.sendCallOfferAck === 'function' && call.id) {
                            await XeonBotInc.sendCallOfferAck(call.id, callerJid, 'reject');
                        }
                    } catch {}

                    if (!antiCallNotified.has(callerJid)) {
                        antiCallNotified.add(callerJid);
                        setTimeout(() => antiCallNotified.delete(callerJid), 60000);
                        await XeonBotInc.sendMessage(callerJid, { text: '📵 Anticall is enabled. Your call was rejected and you will be blocked.' });
                    }
                }
                setTimeout(async () => {
                    try { await XeonBotInc.updateBlockStatus(callerJid, 'block'); } catch {}
                }, 800);
            } catch (e) {}
        });

        XeonBotInc.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(XeonBotInc, update);
        });

        XeonBotInc.ev.on('messages.upsert', async (m) => {
            if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') {
                await handleStatus(XeonBotInc, m);
            }
        });

        XeonBotInc.ev.on('status.update', async (status) => {
            await handleStatus(XeonBotInc, status);
        });

        XeonBotInc.ev.on('messages.reaction', async (status) => {
            await handleStatus(XeonBotInc, status);
        });

        return XeonBotInc
    } catch (error) {
        console.error('Error in startXeonBotInc:', error)
        await delay(5000)
        startXeonBotInc()
    }
}

// Start the bot
startXeonBotInc().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
})

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
})

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})
