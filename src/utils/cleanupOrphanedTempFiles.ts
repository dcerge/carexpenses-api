// ./src/utils/cleanupOrphanedTempFiles.ts
import path from 'path';
import fs from 'fs';
import { logger } from '../logger';

/**
 * Maximum age of temp folders before they are considered orphaned (in hours)
 */
const MAX_AGE_HOURS = 24;

/**
 * Parse requestId to extract timestamp
 * Format: YYYYMMDDHHmmSS-XXXX (e.g., 20241130184532-NPRW)
 * Returns the timestamp as a Date object, or null if parsing fails
 */
const parseRequestIdTimestamp = (requestId: string): Date | null => {
  try {
    // Extract the timestamp part (before the dash)
    const parts = requestId.split('-');
    if (parts.length < 2) {
      return null;
    }

    const timestampStr = parts[0];
    if (timestampStr.length !== 14) {
      return null;
    }

    const year = parseInt(timestampStr.substring(0, 4), 10);
    const month = parseInt(timestampStr.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(timestampStr.substring(6, 8), 10);
    const hour = parseInt(timestampStr.substring(8, 10), 10);
    const minute = parseInt(timestampStr.substring(10, 12), 10);
    const second = parseInt(timestampStr.substring(12, 14), 10);

    const date = new Date(Date.UTC(year, month, day, hour, minute, second));

    // Validate the date is reasonable
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    return null;
  }
};

/**
 * Delete a temp folder and all its contents
 */
const deleteTempFolder = (folderPath: string): boolean => {
  try {
    if (!fs.existsSync(folderPath)) {
      return true;
    }

    // Delete all files in the folder
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recursively delete subdirectories (shouldn't happen, but just in case)
        deleteTempFolder(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    }

    // Delete the folder itself
    fs.rmdirSync(folderPath);
    return true;
  } catch (error: any) {
    logger.error(`Failed to delete temp folder ${folderPath}:`, error.message);
    return false;
  }
};

/**
 * Cleanup orphaned temp upload folders on application startup.
 *
 * This function scans the temp/uploads directory for folders that:
 * 1. Are named with a valid requestId format (YYYYMMDDHHmmSS-XXXX)
 * 2. Are older than MAX_AGE_HOURS
 *
 * These folders are considered orphaned (from crashed or interrupted submissions)
 * and are safely deleted.
 *
 * Call this function once during application startup.
 */
export const cleanupOrphanedTempFiles = (): void => {
  const tempBaseDir = path.join(process.cwd(), 'temp', 'uploads');

  logger.log(`Checking for orphaned temp files in: ${tempBaseDir}`);

  // Check if temp directory exists
  if (!fs.existsSync(tempBaseDir)) {
    logger.log('Temp uploads directory does not exist, nothing to clean up');
    return;
  }

  try {
    const folders = fs.readdirSync(tempBaseDir);
    const now = new Date();
    let deletedCount = 0;
    let skippedCount = 0;

    for (const folderName of folders) {
      const folderPath = path.join(tempBaseDir, folderName);

      // Skip if not a directory
      const stat = fs.statSync(folderPath);
      if (!stat.isDirectory()) {
        continue;
      }

      // Try to parse the folder name as a requestId
      const timestamp = parseRequestIdTimestamp(folderName);

      if (!timestamp) {
        // Folder name doesn't match requestId format
        // Could be a legacy folder or something else - skip it
        logger.log(`Skipping folder with non-requestId name: ${folderName}`);
        skippedCount++;
        continue;
      }

      // Calculate age in hours
      const ageMs = now.getTime() - timestamp.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      if (ageHours > MAX_AGE_HOURS) {
        // Folder is older than threshold - delete it
        logger.log(`Deleting orphaned temp folder: ${folderName} (age: ${ageHours.toFixed(1)} hours)`);

        if (deleteTempFolder(folderPath)) {
          deletedCount++;
        }
      } else {
        // Folder is recent - might still be in processing
        logger.log(`Keeping recent temp folder: ${folderName} (age: ${ageHours.toFixed(1)} hours)`);
        skippedCount++;
      }
    }

    logger.log(`Orphaned temp files cleanup complete: ${deletedCount} deleted, ${skippedCount} skipped`);
  } catch (error: any) {
    logger.error('Error during orphaned temp files cleanup:', error.message);
  }
};
