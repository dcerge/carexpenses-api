// ./src/utils/cleanupOrphanedTempFiles.ts
import path from 'path';
import fs from 'fs';
import { logger } from '../logger';

/**
 * Maximum age of temp folders before they are considered orphaned (in hours)
 */
const MAX_AGE_HOURS = 24;

/**
 * Delete a temp folder and all its contents recursively
 */
const deleteTempFolder = (folderPath: string): boolean => {
  try {
    if (!fs.existsSync(folderPath)) {
      return true;
    }

    const entries = fs.readdirSync(folderPath);

    for (const entry of entries) {
      const entryPath = path.join(folderPath, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isDirectory()) {
        deleteTempFolder(entryPath);
      } else {
        fs.unlinkSync(entryPath);
      }
    }

    fs.rmdirSync(folderPath);
    return true;
  } catch (error: any) {
    logger.error(`Failed to delete temp folder ${folderPath}:`, error.message);
    return false;
  }
};

/**
 * Get the age of a folder in hours using filesystem timestamps.
 * Uses the most recent of mtime and birthtime to determine when
 * the folder was last actively used.
 */
const getFolderAgeHours = (stat: fs.Stats): number => {
  const now = Date.now();

  // Use mtime (last modification) as primary indicator — this updates when
  // files are added/removed from the directory
  const lastActivity = stat.mtimeMs;
  const ageMs = now - lastActivity;

  return ageMs / (1000 * 60 * 60);
};

/**
 * Cleanup orphaned temp upload folders on application startup.
 *
 * This function scans the temp/uploads directory for folders that
 * have not been modified within the last MAX_AGE_HOURS.
 *
 * These folders are considered orphaned (from crashed or interrupted
 * submissions where the normal post-processing cleanup did not run)
 * and are safely deleted.
 *
 * Call this function once during application startup.
 */
export const cleanupOrphanedTempFiles = (): void => {
  const tempBaseDir = path.join(process.cwd(), 'temp', 'uploads');

  logger.log(`Checking for orphaned temp files in: ${tempBaseDir}`);

  if (!fs.existsSync(tempBaseDir)) {
    logger.log('Temp uploads directory does not exist, nothing to clean up');
    return;
  }

  try {
    const entries = fs.readdirSync(tempBaseDir);
    const now = Date.now();
    let deletedCount = 0;
    let skippedCount = 0;
    let filesDeletedCount = 0;

    for (const entryName of entries) {
      const entryPath = path.join(tempBaseDir, entryName);

      let stat: fs.Stats;
      try {
        stat = fs.statSync(entryPath);
      } catch (statError: any) {
        logger.warn(`Cannot stat entry ${entryName}: ${statError.message}`);
        continue;
      }

      if (stat.isDirectory()) {
        // Directory — check age and remove if orphaned
        const ageHours = getFolderAgeHours(stat);

        if (ageHours > MAX_AGE_HOURS) {
          // Count files inside before deleting for logging
          let fileCount = 0;
          try {
            fileCount = fs.readdirSync(entryPath).length;
          } catch (_) {
            // Ignore — we'll attempt deletion anyway
          }

          logger.log(
            `Deleting orphaned temp folder: ${entryName} (age: ${ageHours.toFixed(1)} hours, ${fileCount} entries)`
          );

          if (deleteTempFolder(entryPath)) {
            deletedCount++;
            filesDeletedCount += fileCount;
          }
        } else {
          logger.log(`Keeping recent temp folder: ${entryName} (age: ${ageHours.toFixed(1)} hours)`);
          skippedCount++;
        }
      } else {
        // Stray file directly in temp/uploads — clean up if old
        const ageMs = now - stat.mtimeMs;
        const ageHours = ageMs / (1000 * 60 * 60);

        if (ageHours > MAX_AGE_HOURS) {
          try {
            fs.unlinkSync(entryPath);
            logger.log(`Deleted orphaned temp file: ${entryName} (age: ${ageHours.toFixed(1)} hours)`);
            filesDeletedCount++;
          } catch (unlinkError: any) {
            logger.warn(`Failed to delete orphaned temp file ${entryName}: ${unlinkError.message}`);
          }
        }
      }
    }

    logger.log(
      `Orphaned temp cleanup complete: ${deletedCount} folders deleted, ` +
      `${filesDeletedCount} files removed, ${skippedCount} recent folders kept`
    );
  } catch (error: any) {
    logger.error('Error during orphaned temp files cleanup:', error.message);
  }
};