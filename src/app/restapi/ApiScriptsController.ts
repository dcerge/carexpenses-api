import { BaseController } from '@sdflc/backend-helpers';
import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';
import fs from 'fs';
import path from 'path';
import config from '../../config';

class ApiScriptsController extends BaseController {
  // Allowed script files to serve
  private readonly ALLOWED_SCRIPTS = ['formsubmits-core.js', 'formsubmits-embed.js'];

  // Cache control settings
  private readonly CACHE_MAX_AGE = config.nodeEnv === 'production' ? 3600 : 0; // 1 hour in production, no cache in dev

  init(props: any) {
    const { app } = props;

    // Serve both scripts through the same handler
    app.get('/api/scripts/formsubmits-core.js', this.serveScript.bind(this));
    app.get('/api/scripts/formsubmits-embed.js', this.serveScript.bind(this));

    // Handle OPTIONS for CORS preflight
    app.options('/api/scripts/formsubmits-core.js', this.handleCorsPreFlight.bind(this));
    app.options('/api/scripts/formsubmits-embed.js', this.handleCorsPreFlight.bind(this));
  }

  /**
   * Set CORS headers for cross-origin requests
   */
  private setCorsHeaders(req: any, res: any): void {
    // Get origin from request
    const origin = req.headers.origin;

    if (origin) {
      // Allow the requesting origin
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      // If no origin header, allow all (for direct script tag requests)
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  /**
   * Handle CORS preflight requests
   */
  async handleCorsPreFlight(req: any, res: any) {
    this.setCorsHeaders(req, res);
    res.status(204).send();
  }

  /**
   * Get the script file path based on environment
   */
  private getScriptPath(filename: string): string {
    if (config.nodeEnv === 'production') {
      // In production, scripts are in the dist folder
      return path.join(process.cwd(), 'dist', 'src', 'public', 'api', filename);
    } else {
      // In development, scripts are in the src folder
      return path.join(process.cwd(), 'src', 'public', 'api', filename);
    }
  }

  /**
   * Extract script filename from request path
   */
  private getScriptFilename(req: any): string | null {
    const urlPath = req.path || req.url;
    const filename = path.basename(urlPath);

    // Validate that the requested file is in the allowed list
    if (this.ALLOWED_SCRIPTS.includes(filename)) {
      return filename;
    }

    return null;
  }

  /**
   * Serve JavaScript files with proper headers
   */
  async serveScript(req: any, res: any) {
    try {
      // Extract and validate filename
      const filename = this.getScriptFilename(req);

      if (!filename) {
        return res.status(404).json(new OpResult().addError('', 'Script not found', OP_RESULT_CODES.NOT_FOUND).toJS());
      }

      // Get the full path to the script
      const scriptPath = this.getScriptPath(filename);

      // Check if file exists
      if (!fs.existsSync(scriptPath)) {
        this.logger.error(`Script file not found: ${scriptPath}`);
        return res
          .status(404)
          .json(new OpResult().addError('', 'Script file not found', OP_RESULT_CODES.NOT_FOUND).toJS());
      }

      // Read the script file
      const script = fs.readFileSync(scriptPath, 'utf8');

      // Set CORS headers
      this.setCorsHeaders(req, res);

      // Set content type and caching headers
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

      if (this.CACHE_MAX_AGE > 0) {
        // Production: enable caching
        res.setHeader('Cache-Control', `public, max-age=${this.CACHE_MAX_AGE}, immutable`);
        res.setHeader('ETag', this.generateETag(script));
      } else {
        // Development: disable caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      // Additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Log the request
      this.logger.log(`Serving script: ${filename} to ${req.headers.origin || 'direct request'}`);

      // Send the script
      res.send(script);
    } catch (error: any) {
      this.logger.error('Error serving script:', error);
      res.status(500).json(new OpResult().addError('', 'Failed to load script', OP_RESULT_CODES.EXCEPTION).toJS());
    }
  }

  /**
   * Generate a simple ETag for caching
   */
  private generateETag(content: string): string {
    const crypto = require('crypto');
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
  }
}

export { ApiScriptsController };
