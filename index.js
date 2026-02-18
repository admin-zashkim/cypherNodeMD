/**
 * 𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 ✅ - A WhatsApp Bot
 * Copyright (c) 2024 Professor
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 * 
 * Credits:
 * - Baileys Library by @adiwajshing
 * - Pair Code implemenation inspired by TechGod143 & DGXEON
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
    <title>WhatsApp Pairing</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f0f2f4;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            width: 90%;
            max-width: 400px;
            text-align: center;
        }
        h2 {
            color: #128C7E;
            margin-bottom: 20px;
        }
        .input-group {
            margin-bottom: 20px;
            text-align: left;
        }
        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 600;
            color: #333;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            box-sizing: border-box;
            transition: border 0.3s;
        }
        input:focus {
            border-color: #25D366;
            outline: none;
        }
        button {
            background: #25D366;
            color: white;
            border: none;
            padding: 14px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            transition: background 0.3s;
        }
        button:hover {
            background: #128C7E;
        }
        .loading {
            display: none;
            margin-top: 20px;
        }
        .dots {
            display: inline-block;
        }
        .dots span {
            opacity: 0;
            animation: dot 1.4s infinite;
            font-size: 24px;
        }
        .dots span:nth-child(1) { animation-delay: 0s; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dot {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
        }
        .code-box {
            background: #f8f9fa;
            border: 2px dashed #25D366;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #075E54;
        }
        .copy-btn {
            background: #128C7E;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 10px;
        }
        .copy-btn:hover {
            background: #075E54;
        }
        .error {
            color: #dc3545;
            margin-top: 15px;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #888;
        }
        .info {
            color: #075E54;
            margin-top: 15px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container" id="app">
        <h2>QUEEN_ANITA</h2>
        <p>Enter your number with country code.</p>
        <div id="form-view">
            <div class="input-group">
                <label for="phone">Phone Number (without + or spaces)</label>
                <input type="tel" id="phone" placeholder="e.g. 23490665xxxx">
            </div>
            <button onclick="submitNumber()">ENTER</button>
        </div>
        <div id="loading-view" class="loading">
            <p>Please wait</p>
            <div class="dots">
                <span>.</span><span>.</span><span>.</span>
            </div>
        </div>
        <div id="code-view" style="display:none;">
            <div class="code-box" id="pairCode"></div>
            <button class="copy-btn" onclick="copyCode()">Copy Code</button>
            <p class="info">CODE: YUPRADEV</p>
            <p style="margin-top:15px; font-size:14px;">Open WhatsApp → Settings → Linked Devices → Link a Device</p>
        </div>
        <div id="error-view" class="error" style="display:none;"></div>
        <div class="footer">Powered By David Cyril Tech</div>
    </div>
    <script>
        async function submitNumber() {
            const phone = document.getElementById('phone').value.trim().replace(/[^0-9]/g, '');
            if (!phone) {
                alert('Please enter a phone number');
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
                    document.getElementById('error-view').innerText = 'Error: ' + data.error;
                    document.getElementById('error-view').style.display = 'block';
                    document.getElementById('form-view').style.display = 'block';
                }
            } catch (err) {
                document.getElementById('loading-view').style.display = 'none';
                document.getElementById('error-view').innerText = 'Network error. Please try again.';
                document.getElementById('error-view').style.display = 'block';
                document.getElementById('form-view').style.display = 'block';
            }
        }

        function copyCode() {
            const code = document.getElementById('pairCode').innerText;
            navigator.clipboard.writeText(code).then(() => {
                alert('Code copied!');
            }).catch(() => {
                alert('Failed to copy. Please copy manually.');
            });
        }
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

// Memory monitoring - Restart if RAM gets too high
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log('⚠️ RAM too high (>400MB), restarting bot...')
        process.exit(1)
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
