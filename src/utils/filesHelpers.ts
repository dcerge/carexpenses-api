// ./src/utils/filesHelpers.ts
import path from 'path';
import fs from 'fs';
import { fileTypeFromFile } from 'file-type';
import AdmZip from 'adm-zip';
import { logger } from '../logger';

// =============================================================================
// Types
// =============================================================================

export interface FileSecurityResult {
  isDangerous: boolean;
  reason?: string;
  warning?: string;
}

// =============================================================================
// Constants
// =============================================================================

const dangerousExtensions = [
  // Windows executables
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.scr',
  '.vbs',
  '.wsf',
  '.ps1',
  '.pif',
  '.application',
  '.gadget',
  '.msp',
  '.cpl',
  '.scf',
  '.lnk',
  '.inf',
  '.reg',

  // Unix/Linux executables
  '.sh',
  '.bash',
  '.run',
  '.bin',
  '.out',
  '.app',

  // Scripts that could be executed
  '.jar',
  '.py',
  '.rb',
  '.pl',
  '.php',
  '.asp',
  '.aspx',
  '.jsp',
  '.cgi',

  // DLLs and system files
  '.dll',
  '.so',
  '.dylib',
  '.sys',
  '.drv',
  '.ocx',

  // Mobile apps
  '.apk',
  '.ipa',
  '.deb',
  '.rpm',

  // Disk images and installers
  '.dmg',
  '.iso',
  '.img',
  '.toast',
  '.vcd',
  '.pkg',

  // Database files that could contain macros/scripts
  '.mdb',
  '.accdb',
  '.accde',

  // Other dangerous formats
  '.hta',
  '.jse',
  '.vbe',
  '.ws',
  '.wsc',
  '.action',
  '.workflow',

  // Macro-enabled Office files (blocked by default)
  '.docm',
  '.xlsm',
  '.pptm',
  '.dotm',
  '.xltm',
  '.potm',
  '.xlam',
  '.ppam',
  '.sldm',

  // Other risky formats
  '.swf', // Flash
  '.class', // Java bytecode
  '.chm', // Compiled HTML Help
];

const dangerousMimeTypes = [
  // Executables
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-ms-dos-executable',
  'application/exe',
  'application/x-exe',
  'application/dos-exe',
  'vms/exe',
  'application/x-winexe',
  'application/msdos-windows',

  // Scripts
  'application/x-sh',
  'application/x-bat',
  'application/x-bash',
  'application/x-shellscript',
  'text/x-sh',
  'text/x-shellscript',

  // Java
  'application/java-archive',
  'application/x-java-archive',

  // Mobile apps
  'application/vnd.android.package-archive',

  // System files
  'application/x-msi',
  'application/x-ms-shortcut',

  // Macro-enabled Office
  'application/vnd.ms-word.document.macroEnabled.12',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
];

const dangerousMimeTypes2 = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sharedlib',
  'application/x-mach-binary',
  'application/java-archive',
  'application/x-java-archive',
  'application/vnd.android.package-archive',
  'application/x-sh',
];

// Extensions that require content scanning for scripts
const scriptWarningExtensions = ['.svg', '.xml', '.xsl', '.xslt'];

// Extensions that should be served as download only (not previewed)
const downloadOnlyExtensions = ['.html', '.htm', '.xhtml', '.mhtml', '.mht'];

// Windows reserved filenames
const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

// Dangerous field names (prototype pollution)
const DANGEROUS_FIELD_NAMES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
]);

// =============================================================================
// Filename Sanitization
// =============================================================================

/**
 * Sanitize a filename to prevent path traversal and other attacks
 *
 * @param filename - Original filename to sanitize
 * @returns Sanitized filename safe for storage
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  let sanitized = filename;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters (0x00-0x1F and 0x7F)
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');

  // Get just the filename (remove any directory components)
  sanitized = path.basename(sanitized);

  // Remove leading/trailing dots and spaces (problematic on Windows)
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Replace problematic characters with underscores
  // Keep: alphanumeric, dash, underscore, dot, space
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_. ]/g, '_');

  // Collapse multiple underscores/spaces
  sanitized = sanitized.replace(/[_\s]+/g, '_');

  // Check for Windows reserved names
  const nameWithoutExt = path.parse(sanitized).name.toUpperCase();
  if (WINDOWS_RESERVED_NAMES.has(nameWithoutExt)) {
    sanitized = `_${sanitized}`;
  }

  // Limit length (255 is common filesystem limit)
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    const maxNameLength = 255 - ext.length;
    sanitized = name.substring(0, maxNameLength) + ext;
  }

  // If we ended up with empty string, use default
  if (!sanitized || sanitized === '.' || sanitized === '_') {
    return 'unnamed_file';
  }

  return sanitized;
};

// =============================================================================
// Field Name Validation
// =============================================================================

/**
 * Check if a field name is safe to use as object key
 *
 * @param fieldName - Field name to validate
 * @returns Object with isValid flag and optional error message
 */
export const validateFieldName = (fieldName: string): { isValid: boolean; error?: string } => {
  if (!fieldName || typeof fieldName !== 'string') {
    return { isValid: false, error: 'Field name is required' };
  }

  // Check for prototype pollution
  if (DANGEROUS_FIELD_NAMES.has(fieldName)) {
    return { isValid: false, error: `Field name "${fieldName}" is not allowed` };
  }

  // Check for suspicious patterns
  if (fieldName.startsWith('__') && fieldName.endsWith('__')) {
    return { isValid: false, error: 'Field names with double underscore prefix and suffix are not allowed' };
  }

  // Check length
  if (fieldName.length > 256) {
    return { isValid: false, error: 'Field name exceeds maximum length (256)' };
  }

  // Check for null bytes
  if (fieldName.includes('\0')) {
    return { isValid: false, error: 'Field name contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Sanitize a field name for safe use as object key
 *
 * @param fieldName - Field name to sanitize
 * @returns Sanitized field name
 */
export const sanitizeFieldName = (fieldName: string): string => {
  if (!fieldName || typeof fieldName !== 'string') {
    return 'field';
  }

  let sanitized = fieldName;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Replace dangerous names
  if (DANGEROUS_FIELD_NAMES.has(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  // Handle double underscore pattern
  if (sanitized.startsWith('__') && sanitized.endsWith('__')) {
    sanitized = sanitized.slice(2, -2) || 'field';
  }

  // Limit length
  if (sanitized.length > 256) {
    sanitized = sanitized.substring(0, 256);
  }

  return sanitized || 'field';
};

// =============================================================================
// SVG/XML Content Scanning
// =============================================================================

/**
 * Scan SVG/XML file content for potentially dangerous elements
 *
 * @param filePath - Path to the file
 * @param extension - File extension (lowercase, with dot)
 * @returns Object with scan results
 */
const scanSvgXmlContent = (
  filePath: string,
  extension: string,
): { hasDangerousContent: boolean; hasScripts: boolean; details: string[] } => {
  const result = {
    hasDangerousContent: false,
    hasScripts: false,
    details: [] as string[],
  };

  if (!scriptWarningExtensions.includes(extension)) {
    return result;
  }

  try {
    // Read file content (limit to first 1MB to prevent DoS)
    const stats = fs.statSync(filePath);
    if (stats.size > 1024 * 1024) {
      // For large files, read only the beginning
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(1024 * 1024);
      fs.readSync(fd, buffer, 0, 1024 * 1024, 0);
      fs.closeSync(fd);
      var content = buffer.toString('utf-8');
    } else {
      var content = fs.readFileSync(filePath, 'utf-8');
    }

    const lowerContent = content.toLowerCase();

    // Check for script tags
    if (/<script[\s>]/i.test(content)) {
      result.hasScripts = true;
      result.details.push('Contains <script> tag');
    }

    // Check for event handlers (onload, onclick, onerror, etc.)
    if (/\bon[a-z]+\s*=/i.test(content)) {
      result.hasScripts = true;
      result.details.push('Contains event handlers (onload, onclick, etc.)');
    }

    // Check for javascript: URLs
    if (/javascript\s*:/i.test(content)) {
      result.hasScripts = true;
      result.details.push('Contains javascript: URL');
    }

    // Check for data: URLs with scripts
    if (/data\s*:\s*text\/html/i.test(content)) {
      result.hasScripts = true;
      result.details.push('Contains data:text/html URL');
    }

    // Check for XML bombs (entity expansion)
    if (/<!ENTITY/i.test(content)) {
      result.hasDangerousContent = true;
      result.details.push('Contains XML entity declarations (potential XML bomb)');
    }

    // Check for external DOCTYPE (XXE risk)
    if (/<!DOCTYPE[^>]+(SYSTEM|PUBLIC)/i.test(content)) {
      result.hasDangerousContent = true;
      result.details.push('Contains external DOCTYPE declaration (XXE risk)');
    }

    // Check for external references in SVG (potential SSRF)
    if (extension === '.svg') {
      if (/<image[^>]+href\s*=/i.test(content) || /xlink:href\s*=\s*["'][^#]/i.test(content)) {
        result.details.push('Contains external image references');
      }

      // Check for foreignObject (can embed HTML)
      if (/<foreignObject/i.test(content)) {
        result.hasScripts = true;
        result.details.push('Contains foreignObject element (can embed HTML)');
      }

      // Check for use element with external reference
      if (/<use[^>]+href\s*=\s*["'](?!#)/i.test(content)) {
        result.details.push('Contains external use references');
      }
    }
  } catch (error: any) {
    logger.warn(`Failed to scan SVG/XML content for ${filePath}:`, error.message);
    // On error, be cautious
    result.hasDangerousContent = true;
    result.details.push('Could not scan file content');
  }

  return result;
};

// =============================================================================
// ZIP Bomb Detection
// =============================================================================

/**
 * Check if a ZIP file might be a zip bomb
 *
 * @param filePath - Path to the ZIP file
 * @param maxRatio - Maximum allowed compression ratio (default: 100)
 * @param maxUncompressedSize - Maximum allowed uncompressed size in bytes (default: 100MB)
 * @returns Object with detection results
 */
const checkZipBomb = async (
  filePath: string,
  maxRatio: number = 100,
  maxUncompressedSize: number = 100 * 1024 * 1024,
): Promise<{ isBomb: boolean; reason?: string }> => {
  try {
    const stats = fs.statSync(filePath);
    const compressedSize = stats.size;

    // Skip very small files
    if (compressedSize < 100) {
      return { isBomb: false };
    }

    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    let totalUncompressedSize = 0;

    for (const entry of entries) {
      // Skip directories
      if (entry.isDirectory) {
        continue;
      }

      totalUncompressedSize += entry.header.size;

      // Check ratio per file
      if (entry.header.compressedSize > 0) {
        const ratio = entry.header.size / entry.header.compressedSize;
        if (ratio > maxRatio) {
          return {
            isBomb: true,
            reason: `Suspicious compression ratio detected: ${ratio.toFixed(0)}:1`,
          };
        }
      }

      // Check total size
      if (totalUncompressedSize > maxUncompressedSize) {
        return {
          isBomb: true,
          reason: `Uncompressed size exceeds limit: ${(totalUncompressedSize / 1024 / 1024).toFixed(0)}MB`,
        };
      }

      // Check for nested archives (zip bomb technique)
      const entryExt = path.extname(entry.entryName).toLowerCase();
      if (['.zip', '.tar', '.gz', '.7z', '.rar'].includes(entryExt)) {
        // Nested archive - could be part of a zip bomb
        // We don't recursively check, just note it
        logger.warn(`Nested archive detected in ${filePath}: ${entry.entryName}`);
      }
    }

    // Check overall ratio
    if (compressedSize > 0 && totalUncompressedSize > 0) {
      const overallRatio = totalUncompressedSize / compressedSize;
      if (overallRatio > maxRatio) {
        return {
          isBomb: true,
          reason: `Overall compression ratio suspicious: ${overallRatio.toFixed(0)}:1`,
        };
      }
    }

    return { isBomb: false };
  } catch (error: any) {
    // If we can't read the zip, it might be corrupted or not a real zip
    logger.warn(`Failed to check ZIP for bomb: ${error.message}`);
    return { isBomb: false };
  }
};

// =============================================================================
// Main File Validation Functions
// =============================================================================

/**
 * Synchronous check - used in multer fileFilter (first line of defense)
 */
export const isExecutableFile = (file: { originalname: string; mimetype: string }): boolean => {
  // Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  if (dangerousExtensions.includes(extension)) {
    return true;
  }

  // Check MIME type (from client, can be spoofed but adds a layer)
  const mimetype = file.mimetype.toLowerCase();
  if (dangerousMimeTypes.includes(mimetype)) {
    return true;
  }

  // Additional check for files without extension but with executable MIME
  if (!extension && mimetype.includes('executable')) {
    return true;
  }

  return false;
};

/**
 * Check if a file extension should be served as download only (not previewed)
 */
export const isDownloadOnlyExtension = (filename: string): boolean => {
  const extension = path.extname(filename).toLowerCase();
  return downloadOnlyExtensions.includes(extension);
};

/**
 * Asynchronous deep check - used after file is on disk (second line of defense)
 *
 * @returns Object with isDangerous flag, optional reason, and optional warning
 */
export const isExecutableOrDangerousFile = async (file: {
  originalname: string;
  mimetype: string;
  path: string;
}): Promise<FileSecurityResult> => {
  const extension = path.extname(file.originalname).toLowerCase();

  try {
    // Use file-type library to detect actual file type from content
    const detectedType = await fileTypeFromFile(file.path);

    if (detectedType) {
      // Check if detected MIME type is dangerous
      if (dangerousMimeTypes2.includes(detectedType.mime)) {
        return {
          isDangerous: true,
          reason: `Dangerous file type detected: ${detectedType.mime}`,
        };
      }

      // Check for common executable extensions detected from content
      if (detectedType.ext === 'exe' || detectedType.ext === 'dll') {
        return {
          isDangerous: true,
          reason: 'Executable file detected by content analysis',
        };
      }

      // Check for macro-enabled Office files by content
      if (
        detectedType.mime.includes('macroEnabled') ||
        ['docm', 'xlsm', 'pptm', 'dotm', 'xltm', 'potm'].includes(detectedType.ext || '')
      ) {
        return {
          isDangerous: true,
          reason: 'Macro-enabled Office file detected. These files are not allowed for security reasons.',
        };
      }
    }

    // Manual check: Read first 4 bytes for executable signatures
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(file.path, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    // Check for PE executable signature (MZ header) - Windows
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return { isDangerous: true, reason: 'Windows executable detected (MZ header)' };
    }

    // Check for ELF executable signature - Linux/Unix
    if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      return { isDangerous: true, reason: 'Linux/Unix executable detected (ELF header)' };
    }

    // Check for Mach-O executable signature - macOS
    if (
      (buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && buffer[3] === 0xce) ||
      (buffer[0] === 0xce && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe) ||
      (buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe)
    ) {
      return { isDangerous: true, reason: 'macOS executable detected (Mach-O header)' };
    }

    // Check ZIP files for bombs
    if (extension === '.zip' || (detectedType && detectedType.ext === 'zip')) {
      const zipCheck = await checkZipBomb(file.path);
      if (zipCheck.isBomb) {
        return { isDangerous: true, reason: zipCheck.reason };
      }
    }

    // Scan SVG/XML files for dangerous content
    if (scriptWarningExtensions.includes(extension)) {
      const svgScan = scanSvgXmlContent(file.path, extension);

      // XML bombs and XXE are blocked
      if (svgScan.hasDangerousContent) {
        return {
          isDangerous: true,
          reason: svgScan.details.join('; '),
        };
      }

      // Scripts in SVG generate a warning but file is accepted
      if (svgScan.hasScripts) {
        return {
          isDangerous: false,
          warning: `This file may contain executable scripts: ${svgScan.details.join('; ')}. Exercise caution when opening.`,
        };
      }
    }

    // Check for HTML files - accepted but with warning
    if (downloadOnlyExtensions.includes(extension)) {
      return {
        isDangerous: false,
        warning: 'This HTML file will be available for download only and cannot be previewed for security reasons.',
      };
    }
  } catch (error: any) {
    logger.warn(`Failed to detect file type for ${file.originalname}:`, error.message);
    // On error, be cautious
    if (extension && !extension.match(/\.(jpg|jpeg|png|gif|pdf|txt|doc|docx|xls|xlsx|ppt|pptx|csv|zip)$/i)) {
      return { isDangerous: true, reason: 'Could not verify file type and extension is suspicious' };
    }
  }

  return { isDangerous: false };
};

// =============================================================================
// Utility Functions
// =============================================================================

export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) {
    return '0 KB';
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

export const getTempUploadPath = (requestId: string): string => {
  return path.join(process.cwd(), 'temp', 'uploads', requestId);
};
