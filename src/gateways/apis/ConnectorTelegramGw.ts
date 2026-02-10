import axios, { AxiosError } from 'axios';
import { logger } from '../../logger';
import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const MAX_MESSAGE_LENGTH = 4096;
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1000, 2000];

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface TelegramSendParams {
  chatId?: string;
  message: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  inlineKeyboard?: { text: string; url: string }[][];
}

class ConnectorTelegramGw {
  private botToken: string = '';
  private defaultChatId: string = '';

  setBotToken(botToken: string): this {
    this.botToken = botToken;
    return this;
  }

  setChatId(chatId: string): this {
    this.defaultChatId = chatId;
    return this;
  }

  configure(config: TelegramConfig): this {
    this.botToken = config.botToken;
    this.defaultChatId = config.chatId;
    return this;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryable(error: any): boolean {
    if (!error.isAxiosError) return true;

    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    if (status === 400 || status === 401 || status === 403 || status === 404) {
      return false;
    }

    const description = ((axiosError.response?.data as any)?.description || '').toLowerCase();
    const nonRetryable = [
      'bot was blocked',
      'chat not found',
      'bot is not a member',
      'not enough rights',
      'chat_write_forbidden',
      'bot was kicked',
      'user is deactivated',
      'invalid token',
    ];

    if (nonRetryable.some((e) => description.includes(e))) {
      return false;
    }

    return true;
  }

  private extractError(error: any): { code: string; message: string } {
    if (error.isAxiosError) {
      const axiosError = error as AxiosError;
      const responseData = axiosError.response?.data as any;
      return {
        code: axiosError.response?.status?.toString() || '',
        message: responseData?.description || axiosError.message,
      };
    }
    return {
      code: error.code || '',
      message: error.message || 'Unknown error',
    };
  }

  public async send(params: TelegramSendParams): Promise<OpResult> {
    const result = new OpResult();
    const { chatId: overrideChatId, message, parseMode = 'HTML', disableWebPagePreview = true, inlineKeyboard } = params;
    const botToken = this.botToken;
    const chatId = overrideChatId || this.defaultChatId;

    if (!botToken || !/^\d+:[A-Za-z0-9_-]+$/.test(botToken)) {
      return result.addError('', 'Invalid or missing Telegram Bot Token. Call setBotToken() or configure() first.', OP_RESULT_CODES.VALIDATION_FAILED);
    }

    if (!chatId) {
      return result.addError('', 'Telegram Chat ID is required. Call setChatId(), configure(), or pass chatId in send params.', OP_RESULT_CODES.VALIDATION_FAILED);
    }

    if (!message) {
      return result.addError('', 'Message is required', OP_RESULT_CODES.VALIDATION_FAILED);
    }

    const truncatedMessage =
      message.length > MAX_MESSAGE_LENGTH ? message.substring(0, MAX_MESSAGE_LENGTH - 3) + '...' : message;

    const payload: any = {
      chat_id: chatId,
      text: truncatedMessage,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
    };

    if (inlineKeyboard) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    const apiUrl = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const response = await axios.post(apiUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        });

        if (response.data?.ok) {
          logger.log(`Telegram message sent, message_id: ${response.data.result?.message_id}`);
          result.setData({
            success: true,
            messageId: response.data.result?.message_id,
          });
          return result;
        }

        throw new Error(`Unexpected Telegram response: ${JSON.stringify(response.data)}`);
      } catch (error: any) {
        lastError = error;
        const { code, message: errMsg } = this.extractError(error);
        logger.error(`Telegram send attempt ${attempt} failed: [${code}] ${errMsg}`);

        if (!this.isRetryable(error) || attempt > MAX_RETRIES) break;

        const delayMs = RETRY_DELAYS_MS[attempt - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        await this.sleep(delayMs);
      }
    }

    const { code, message: errMsg } = this.extractError(lastError);
    result.addError('', `Telegram notification failed: ${code ? `[${code}] ` : ''}${errMsg}`, OP_RESULT_CODES.FAILED);
    return result;
  }
}

export { ConnectorTelegramGw };