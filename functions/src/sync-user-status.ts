import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

interface UserDocument {
  isActive: boolean;
  role: string;
  officeId: string;
  name?: string;
  email?: string;
  lastModifiedBy?: string;
}

interface AuditLog {
  action: 'block' | 'unblock';
  adminId: string;
  adminName: string;
  adminEmail: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  timestamp: admin.firestore.FieldValue;
  previousStatus: boolean;
  newStatus: boolean;
}

export const syncUserStatus = onDocumentUpdated(
  'users/{userId}',
  async (event) => {
    const newData = event.data?.after.data() as UserDocument;
    const previousData = event.data?.before.data() as UserDocument;

    if (!newData || !previousData || newData.isActive === previousData.isActive) {
      return;
    }

    try {
      // Get admin user who made the change from the document
      const adminUid = newData.lastModifiedBy;
      if (!adminUid) {
        logger.warn('No lastModifiedBy field found in document');
        throw new Error('No user information available for audit log');
      }

      // Get admin details
      const [officeAdminUser, officeAdminDoc] = await Promise.all([
        admin.auth().getUser(adminUid),
        admin.firestore().doc(`users/${adminUid}`).get()
      ]);

      const officeAdminData = officeAdminDoc.data() as UserDocument;

      // Update Auth status
      await admin.auth().updateUser(event.params.userId, {
        disabled: !newData.isActive
      });

      // Create audit log
      const auditLog: AuditLog = {
        action: newData.isActive ? 'unblock' : 'block',
        adminId: adminUid,
        adminName: officeAdminData?.name || officeAdminUser.displayName || 'Unknown',
        adminEmail: officeAdminUser.email || 'Unknown',
        customerId: event.params.userId,
        customerName: newData.name || 'Unknown',
        customerEmail: newData.email || 'Unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        previousStatus: previousData.isActive,
        newStatus: newData.isActive
      };

      await admin.firestore()
        .collection('auditLogs')
        .doc(newData.officeId)
        .collection('userLogs')
        .add(auditLog);
      
      logger.info(`User ${event.params.userId} status updated by ${adminUid}`);
    } catch (error) {
      logger.error('Error updating user:', error);
      if (event.data?.after.ref) {
        await event.data.after.ref.update({ isActive: previousData.isActive });
      }
      throw new Error('Failed to sync user status');
    }
  }
);