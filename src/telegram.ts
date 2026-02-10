// ./src/telegram.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ConnectorTelegramGw } from './gateways';
import { redisClient } from './redisClient';
import { logger } from './logger';
import config from './config';
import packageJson from '../package.json';

dayjs.extend(utc);

const THROTTLE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const REDIS_KEY_LAST_CRASH = 'telegram:last_crash_sent_at';
const REDIS_KEY_SUPPRESSED = 'telegram:suppressed_crash_count';

const telegramBot = new ConnectorTelegramGw();

telegramBot.configure({
  botToken: config.telegramBotId,
  chatId: config.telegramChatId,
});

class TelegramMessageFactory {
  private static get serviceInfo(): string {
    return [
      `📦 <b>Service:</b> ${packageJson.name || 'unknown'}`,
      `🏷 <b>Version:</b> ${packageJson.version || 'unknown'}`,
      `🌐 <b>Environment:</b> ${config.nodeEnv || 'unknown'}`,
    ].join('\n');
  }

  private static formatTimestamp(): string {
    return dayjs().utc().format('MMM D, YYYY [at] h:mm:ss A [UTC]');
  }

  private static escapeHtml(text: string): string {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  static appStarted(): string {
    return [
      '🚀 <b>Application Started</b>',
      '',
      `🕐 <b>Server Time:</b> ${this.formatTimestamp()}`,
      this.serviceInfo,
    ].join('\n');
  }

  static appStopped(signal: string): string {
    return [
      '🛑 <b>Application Stopped</b>',
      '',
      `🕐 <b>Server Time:</b> ${this.formatTimestamp()}`,
      `⚡ <b>Signal:</b> ${this.escapeHtml(signal)}`,
      this.serviceInfo,
    ].join('\n');
  }

  static appCrashed(error: Error | string, suppressedCount: number = 0): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? error.stack : '';

    // Truncate stack to keep message within Telegram limits
    const maxStackLength = 2000;
    const truncatedStack =
      stack.length > maxStackLength ? stack.substring(0, maxStackLength) + '\n... (truncated)' : stack;

    const lines = [
      '🔴 <b>Application Crashed</b>',
      '',
      `🕐 <b>Server Time:</b> ${this.formatTimestamp()}`,
      this.serviceInfo,
      '',
      `❌ <b>Error:</b> ${this.escapeHtml(errorMessage)}`,
    ];

    if (truncatedStack) {
      lines.push('');
      lines.push(`<pre>${this.escapeHtml(truncatedStack)}</pre>`);
    }

    if (suppressedCount > 0) {
      lines.push('');
      lines.push(`⚠️ <i>${suppressedCount} crash notification(s) were suppressed since last alert.</i>`);
    }

    return lines.join('\n');
  }
}

class TelegramNotifier {
  /**
   * Send crash notification with Redis-backed throttling.
   * Returns true if the message was sent, false if throttled.
   */
  async sendCrash(error: Error | string): Promise<boolean> {
    try {
      const now = Date.now();

      // Check throttle
      if (redisClient?.isReady) {
        const lastSentStr = await redisClient.get(REDIS_KEY_LAST_CRASH);
        const lastSent = lastSentStr ? parseInt(lastSentStr, 10) : 0;

        if (now - lastSent < THROTTLE_INTERVAL_MS) {
          // Throttled — increment suppressed counter
          await redisClient.incr(REDIS_KEY_SUPPRESSED);
          logger.log('Telegram crash notification throttled');
          return false;
        }

        // Allowed — get and reset suppressed count
        const suppressedStr = await redisClient.get(REDIS_KEY_SUPPRESSED);
        const suppressedCount = suppressedStr ? parseInt(suppressedStr, 10) : 0;

        const message = TelegramMessageFactory.appCrashed(error, suppressedCount);
        await telegramBot.send({ message });

        // Update Redis
        await redisClient.set(REDIS_KEY_LAST_CRASH, now.toString());
        await redisClient.set(REDIS_KEY_SUPPRESSED, '0');
      } else {
        // No Redis — send without throttling (better noisy than silent)
        const message = TelegramMessageFactory.appCrashed(error);
        await telegramBot.send({ message });
      }

      return true;
    } catch (err) {
      logger.error('Failed to send Telegram crash notification:', err);
      return false;
    }
  }

  /**
   * Send graceful shutdown notification (not throttled).
   */
  async sendStopped(signal: string): Promise<void> {
    try {
      const message = TelegramMessageFactory.appStopped(signal);
      await telegramBot.send({ message });
    } catch (err) {
      logger.error('Failed to send Telegram stop notification:', err);
    }
  }

  /**
   * Send app started notification (not throttled).
   */
  async sendStarted(): Promise<void> {
    try {
      const message = TelegramMessageFactory.appStarted();
      await telegramBot.send({ message });
    } catch (err) {
      logger.error('Failed to send Telegram start notification:', err);
    }
  }
}

const telegramNotifier = new TelegramNotifier();

export { telegramBot, telegramNotifier, TelegramMessageFactory };