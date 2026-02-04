const { Boom } = require('@hapi/boom');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
require('dotenv').config();

/* ─────────────────────────────
   DATABASE
───────────────────────────── */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/* ─────────────────────────────
   SECURITY MIDDLEWARE
───────────────────────────── */
function verifyRunnerSecret(req, res, next) {
  const secret = req.headers['x-runner-secret'];
  if (secret !== process.env.BOT_RUNNER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/* ─────────────────────────────
   BOT MANAGER
───────────────────────────── */
class BotManager {
  constructor() {
    this.activeSessions = new Map();
    this.setupWebAPI();
    this.restoreOnlineBots();
  }

  /* ───── Restore bots after restart ───── */
  async restoreOnlineBots() {
    const { rows } = await pool.query(
      "SELECT * FROM bots WHERE session_status = 'online'"
    );

    for (const bot of rows) {
      await this.startBotSession(bot);
    }

    console.log(chalk.green(`♻ Restored ${rows.length} bots`));
  }

  /* ───── Start WhatsApp session ───── */
  async startBotSession(bot) {
    if (this.activeSessions.has(bot.id)) return;

    const sessionDir = path.join(
      process.env.SESSION_DIR || './sessions',
      bot.id
    );
    fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['WhatsApp Bot Platform', 'Chrome', '1.0.0']
    });

    const session = {
      id: bot.id,
      sock,
      saveCreds,
      settings: bot.settings || {}
    };

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', (m) =>
      this.handleMessages(session, m)
    );

    sock.ev.on('connection.update', async (u) => {
      if (u.connection === 'open') {
        console.log(chalk.green(`✅ Bot ${bot.id} connected`));
        await pool.query(
          "UPDATE bots SET session_status='online' WHERE id=$1",
          [bot.id]
        );
      }

      if (u.connection === 'close') {
        const reason = new Boom(u.lastDisconnect?.error)?.output?.statusCode;
        if (reason === DisconnectReason.loggedOut) {
          await this.stopBot(bot.id, true);
        }
      }
    });

    this.activeSessions.set(bot.id, session);
    console.log(chalk.cyan(`🤖 Session started: ${bot.id}`));
  }

  /* ───── Stop bot ───── */
  async stopBot(botId, clearSession = false) {
    const session = this.activeSessions.get(botId);
    if (session) {
      await session.sock.end();
      this.activeSessions.delete(botId);
    }

    if (clearSession) {
      const dir = path.join(process.env.SESSION_DIR || './sessions', botId);
      fs.rmSync(dir, { recursive: true, force: true });
    }

    await pool.query(
      "UPDATE bots SET session_status='offline' WHERE id=$1",
      [botId]
    );

    console.log(chalk.yellow(`🛑 Bot stopped: ${botId}`));
  }

  /* ───── Handle incoming messages ───── */
  async handleMessages(session, m) {
    const msg = m.messages?.[0];
    if (!msg || msg.key.fromMe || !msg.message) return;

    const jid = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';

    if (text.startsWith('!')) {
      await session.sock.sendMessage(jid, {
        text: '✅ Command received'
      });
    }

    if (session.settings?.autoTyping) {
      await session.sock.sendPresenceUpdate('composing', jid);
      setTimeout(
        () => session.sock.sendPresenceUpdate('paused', jid),
        3000
      );
    }
  }

  /* ─────────────────────────────
     HTTP API
  ───────────────────────────── */
  setupWebAPI() {
    const app = express();
    app.use(express.json());

    app.get('/health', (_, res) =>
      res.json({
        status: 'ok',
        sessions: this.activeSessions.size
      })
    );

    app.use('/api', verifyRunnerSecret);

    /* Start session (CALLED BY BACKEND) */
    app.post('/api/start-session', async (req, res) => {
      const { botId } = req.body;
      if (!botId) return res.status(400).json({ error: 'botId required' });

      const { rows } = await pool.query(
        'SELECT * FROM bots WHERE id=$1',
        [botId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Bot not found' });

      await this.startBotSession(rows[0]);
      res.json({ success: true });
    });

    /* Stop session */
    app.post('/api/stop-session', async (req, res) => {
      await this.stopBot(req.body.botId);
      res.json({ success: true });
    });

    const PORT = process.env.PORT || 3002;
    app.listen(PORT, () =>
      console.log(chalk.blue(`🌐 Bot runner on ${PORT}`))
    );
  }
}

/* ─────────────────────────────
   START
───────────────────────────── */
new BotManager();

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});
