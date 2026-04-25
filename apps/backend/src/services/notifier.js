/**
 * Notification service — Telegram alerts.
 * Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env to enable.
 */
let bot = null;

function initNotifier() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const TelegramBot = require('node-telegram-bot-api');
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    console.log('✅ Telegram notifier ready');
  } catch (e) {
    console.warn('⚠️  Telegram notifier failed to init:', e.message);
  }
}

async function notify(message) {
  if (!bot || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, `🪙 PisoTab\n${message}`);
  } catch (e) {
    console.warn('Telegram send failed:', e.message);
  }
}

module.exports = { initNotifier, notify };
