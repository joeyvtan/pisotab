/**
 * Notification service — Telegram alerts.
 * Falls back to env vars if no per-user credentials are provided.
 */
let globalBot = null;

function initNotifier() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const TelegramBot = require('node-telegram-bot-api');
    globalBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    console.log('✅ Telegram notifier ready');
  } catch (e) {
    console.warn('⚠️  Telegram notifier failed to init:', e.message);
  }
}

async function notify(message, userCredentials) {
  const token   = userCredentials?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
  const chatId  = userCredentials?.telegram_chat_id   || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    // Use per-user bot if different from global
    if (userCredentials?.telegram_bot_token && userCredentials.telegram_bot_token !== process.env.TELEGRAM_BOT_TOKEN) {
      const TelegramBot = require('node-telegram-bot-api');
      const userBot = new TelegramBot(token, { polling: false });
      await userBot.sendMessage(chatId, `🪙 PisoTab\n${message}`);
    } else if (globalBot) {
      await globalBot.sendMessage(chatId, `🪙 PisoTab\n${message}`);
    }
  } catch (e) {
    console.warn('Telegram send failed:', e.message);
  }
}

module.exports = { initNotifier, notify };
