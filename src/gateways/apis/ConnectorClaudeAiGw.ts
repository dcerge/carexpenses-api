import axios, { AxiosError } from 'axios';
import { logger } from '../../logger';
import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_MAX_TOKENS = 4096;
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1000, 2000];

export type ClaudeMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface ClaudeAiConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface ClaudeImageSource {
  type: 'base64';
  mediaType: ClaudeMediaType;
  data: string; // base64-encoded image data
}

export interface ClaudeVisionParams {
  image: ClaudeImageSource;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeTextParams {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeApiResponse {
  id: string;
  type: string;
  role: string;
  content: { type: string; text: string }[];
  model: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

class ConnectorClaudeAiGw {
  private apiKey: string = '';
  private model: string = DEFAULT_MODEL;
  private maxTokens: number = DEFAULT_MAX_TOKENS;

  setApiKey(apiKey: string): this {
    this.apiKey = apiKey;
    return this;
  }

  setModel(model: string): this {
    this.model = model;
    return this;
  }

  setMaxTokens(maxTokens: number): this {
    this.maxTokens = maxTokens;
    return this;
  }

  configure(config: ClaudeAiConfig): this {
    this.apiKey = config.apiKey;
    if (config.model) {
      this.model = config.model;
    }
    if (config.maxTokens) {
      this.maxTokens = config.maxTokens;
    }
    return this;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryable(error: any): boolean {
    if (!error.isAxiosError) return true;

    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    // Client errors that won't resolve on retry
    if (status === 400 || status === 401 || status === 403 || status === 404) {
      return false;
    }

    // 429 (rate limit) and 5xx are retryable
    return true;
  }

  private extractError(error: any): { code: string; message: string } {
    if (error.isAxiosError) {
      const axiosError = error as AxiosError;
      const responseData = axiosError.response?.data as any;
      return {
        code: axiosError.response?.status?.toString() || '',
        message: responseData?.error?.message || responseData?.message || axiosError.message,
      };
    }
    return {
      code: error.code || '',
      message: error.message || 'Unknown error',
    };
  }

  private parseResponse(data: any): ClaudeApiResponse {
    return {
      id: data.id,
      type: data.type,
      role: data.role,
      content: (data.content || []).map((block: any) => ({
        type: block.type,
        text: block.text || '',
      })),
      model: data.model,
      stopReason: data.stop_reason,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
    };
  }

  private getTextContent(response: ClaudeApiResponse): string {
    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  /**
   * Sends an image with a text prompt to Claude Vision API.
   * Used for receipt scanning, document analysis, etc.
   */
  public async analyzeImage(params: ClaudeVisionParams): Promise<OpResult> {
    const result = new OpResult();
    const {
      image,
      prompt,
      systemPrompt,
      model = this.model,
      maxTokens = this.maxTokens,
      temperature,
    } = params;

    // --- Validation ---
    if (!this.apiKey) {
      return result.addError(
        '',
        'Anthropic API key is required. Call setApiKey() or configure() first.',
        OP_RESULT_CODES.VALIDATION_FAILED
      );
    }

    if (!image || !image.data) {
      return result.addError('', 'Image data is required.', OP_RESULT_CODES.VALIDATION_FAILED);
    }

    if (!image.mediaType) {
      return result.addError('', 'Image media type is required.', OP_RESULT_CODES.VALIDATION_FAILED);
    }

    if (!prompt) {
      return result.addError('', 'Prompt is required.', OP_RESULT_CODES.VALIDATION_FAILED);
    }

    // --- Build payload ---
    const payload: any = {
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.mediaType,
                data: image.data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    if (temperature !== undefined) {
      payload.temperature = temperature;
    }

    return this.sendRequest(payload, result);
  }

  /**
   * Sends a text-only prompt to Claude API.
   * Can be used for post-processing, classification, etc.
   */
  public async sendMessage(params: ClaudeTextParams): Promise<OpResult> {
    const result = new OpResult();
    const {
      prompt,
      systemPrompt,
      model = this.model,
      maxTokens = this.maxTokens,
      temperature,
    } = params;

    // --- Validation ---
    if (!this.apiKey) {
      return result.addError(
        '',
        'Anthropic API key is required. Call setApiKey() or configure() first.',
        OP_RESULT_CODES.VALIDATION_FAILED
      );
    }

    if (!prompt) {
      return result.addError('', 'Prompt is required.', OP_RESULT_CODES.VALIDATION_FAILED);
    }

    // --- Build payload ---
    const payload: any = {
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    if (temperature !== undefined) {
      payload.temperature = temperature;
    }

    return this.sendRequest(payload, result);
  }

  /**
   * Internal method to send a request to the Anthropic API with retry logic.
   */
  private async sendRequest(payload: any, result: OpResult): Promise<OpResult> {
    const apiUrl = `${ANTHROPIC_API_BASE}/messages`;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const response = await axios.post(apiUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': ANTHROPIC_API_VERSION,
          },
          timeout: 120000, // 2 minutes — image analysis can take longer
        });

        const parsed = this.parseResponse(response.data);
        const textContent = this.getTextContent(parsed);

        logger.log(
          `Claude API response received. Model: ${parsed.model}, ` +
          `tokens: ${parsed.usage.inputTokens}in/${parsed.usage.outputTokens}out, ` +
          `stop: ${parsed.stopReason}`
        );

        result.setData({
          text: textContent,
          response: parsed,
        });

        return result;
      } catch (error: any) {
        lastError = error;
        const { code, message: errMsg } = this.extractError(error);
        logger.error(`Claude API attempt ${attempt} failed: [${code}] ${errMsg}`);

        if (!this.isRetryable(error) || attempt > MAX_RETRIES) break;

        const delayMs = RETRY_DELAYS_MS[attempt - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        await this.sleep(delayMs);
      }
    }

    const { code, message: errMsg } = this.extractError(lastError);
    result.addError(
      '',
      `Claude API request failed: ${code ? `[${code}] ` : ''}${errMsg}`,
      OP_RESULT_CODES.FAILED
    );

    return result;
  }
}

export { ConnectorClaudeAiGw };