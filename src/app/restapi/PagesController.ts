import { BaseController } from '@sdflc/backend-helpers';
import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';
import fs from 'fs';
import path from 'path';
import config from '../../config';

class PagesController extends BaseController {
  // Base directory for pages (relative to project root)
  private readonly PAGES_BASE_DIR = 'src/public/pages';

  // Cache control settings
  private readonly CACHE_MAX_AGE = config.nodeEnv === 'production' ? 3600 : 0; // 1 hour in production, no cache in dev

  // MIME types mapping
  private readonly MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
  };

  // Default MIME type for unknown extensions
  private readonly DEFAULT_MIME_TYPE = 'application/octet-stream';

  init(props: any) {
    const { app } = props;

    // Handle all requests under /pages/
    // Express 5+ requires named wildcard parameters
    app.get('/pages/*path', this.servePage.bind(this));
    app.get('/pages', this.servePage.bind(this));

    // Handle OPTIONS for CORS preflight
    app.options('/pages/*path', this.handleCorsPreFlight.bind(this));
    app.options('/pages', this.handleCorsPreFlight.bind(this));
  }

  /**
   * Set CORS headers for cross-origin requests
   */
  private setCorsHeaders(req: any, res: any): void {
    const origin = req.headers.origin;

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
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
   * Get the base directory for pages based on environment
   */
  private getPagesBaseDir(): string {
    if (config.nodeEnv === 'production') {
      return path.join(process.cwd(), 'dist', this.PAGES_BASE_DIR);
    } else {
      return path.join(process.cwd(), this.PAGES_BASE_DIR);
    }
  }

  /**
   * Extract and validate the requested file path from the URL
   * Returns null if path is invalid or attempts path traversal
   */
  private getRequestedFilePath(req: any): string | null {
    // In Express 5+, the wildcard is captured in req.params.path
    // It can be an array or string depending on the route
    let relativePath = '';

    if (req.params && req.params.path) {
      // Handle both array and string cases
      relativePath = Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path;
    }

    // Decode URI components
    try {
      relativePath = decodeURIComponent(relativePath);
    } catch {
      // Invalid URI encoding
      return null;
    }

    // Normalize the path to resolve any . or .. components
    const normalizedPath = path.normalize(relativePath);

    // Check for path traversal attempts
    // After normalization, the path should not start with .. or contain ..
    if (normalizedPath.startsWith('..') || normalizedPath.includes('..')) {
      this.logger.warn(`Path traversal attempt detected: ${relativePath}`);
      return null;
    }

    // Additional check: ensure the path doesn't contain null bytes
    if (relativePath.includes('\0')) {
      this.logger.warn(`Null byte injection attempt detected: ${relativePath}`);
      return null;
    }

    return normalizedPath;
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return this.MIME_TYPES[ext] || this.DEFAULT_MIME_TYPE;
  }

  /**
   * Check if the MIME type is binary (non-text)
   */
  private isBinaryFile(mimeType: string): boolean {
    return (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('font/') ||
      mimeType === 'application/pdf' ||
      mimeType === 'application/octet-stream'
    );
  }

  /**
   * Generate a simple ETag for caching
   */
  private generateETag(content: Buffer | string): string {
    const crypto = require('crypto');
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
  }

  /**
   * Set caching headers based on environment
   */
  private setCacheHeaders(res: any, content: Buffer | string): void {
    if (this.CACHE_MAX_AGE > 0) {
      // Production: enable caching
      res.setHeader('Cache-Control', `public, max-age=${this.CACHE_MAX_AGE}`);
      res.setHeader('ETag', this.generateETag(content));
    } else {
      // Development: disable caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }

  /**
   * Serve static pages/files with proper headers
   */
  async servePage(req: any, res: any) {
    try {
      // Extract and validate the requested path
      const relativePath = this.getRequestedFilePath(req);

      if (relativePath === null) {
        return res.status(400).json(new OpResult().addError('', 'Invalid request path', OP_RESULT_CODES.FAILED).toJS());
      }

      const baseDir = this.getPagesBaseDir();
      let fullPath = path.join(baseDir, relativePath);

      // Verify the resolved path is still within the pages directory (additional security check)
      const resolvedPath = path.resolve(fullPath);
      const resolvedBaseDir = path.resolve(baseDir);

      if (!resolvedPath.startsWith(resolvedBaseDir)) {
        this.logger.warn(`Path traversal attempt blocked: ${resolvedPath}`);
        return res.status(403).json(new OpResult().addError('', 'Access denied', OP_RESULT_CODES.UNAUTHORIZED).toJS());
      }

      // Check if path exists
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json(new OpResult().addError('', 'Page not found', OP_RESULT_CODES.NOT_FOUND).toJS());
      }

      // Get file stats
      const stats = fs.statSync(fullPath);

      // If it's a directory, look for index.html
      if (stats.isDirectory()) {
        fullPath = path.join(fullPath, 'index.html');

        if (!fs.existsSync(fullPath)) {
          return res
            .status(404)
            .json(new OpResult().addError('', 'Index page not found', OP_RESULT_CODES.NOT_FOUND).toJS());
        }
      }

      // Get MIME type
      const mimeType = this.getMimeType(fullPath);
      const isBinary = this.isBinaryFile(mimeType);

      // Read the file
      const content = isBinary ? fs.readFileSync(fullPath) : fs.readFileSync(fullPath, 'utf8');

      // Set CORS headers
      this.setCorsHeaders(req, res);

      // Set content type
      res.setHeader('Content-Type', mimeType);

      // Set caching headers
      this.setCacheHeaders(res, content);

      // Additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Log the request
      this.logger.log(`Serving page: ${relativePath} to ${req.headers.origin || 'direct request'}`);

      // Send the content
      res.send(content);
    } catch (error: any) {
      this.logger.error('Error serving page:', error);
      res.status(500).json(new OpResult().addError('', 'Failed to load page', OP_RESULT_CODES.EXCEPTION).toJS());
    }
  }
}

export { PagesController };
