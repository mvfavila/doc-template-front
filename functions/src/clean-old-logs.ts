import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const cleanOldLogs = onSchedule({
  schedule: '0 0 * * *',
  timeZone: 'UTC',
  retryCount: 3
}, async () => {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 3); // Keep 3 months of logs

  const offices = await admin.firestore().collection('auditLogs').listDocuments();
  
  let totalDeleted = 0;
  
  for (const officeRef of offices) {
    try {
      const oldLogs = await officeRef.collection('userLogs')
        .where('timestamp', '<', cutoffDate)
        .get();
      
      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < oldLogs.docs.length; i += batchSize) {
        const batch = admin.firestore().batch();
        const batchDocs = oldLogs.docs.slice(i, i + batchSize);
        
        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
          totalDeleted++;
        });
        
        await batch.commit();
        logger.info(`Deleted batch of ${batchDocs.length} logs from office ${officeRef.id}`);
      }
      
      if (oldLogs.size > 0) {
        logger.info(`Deleted total ${oldLogs.size} old logs from office ${officeRef.id}`);
      }
    } catch (error) {
      logger.error(`Error cleaning logs for office ${officeRef.id}:`, error);
    }
  }
  
  logger.info(`Cleanup completed. Total logs deleted: ${totalDeleted}`);
});