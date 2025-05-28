import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

interface UserDocument {
  isActive: boolean;
  role: string;
  officeId: string;
}

export const syncUserStatus = onDocumentUpdated(
  'users/{userId}',
  async (event) => {
    const newData = event.data?.after.data() as UserDocument;
    const previousData = event.data?.before.data() as UserDocument;

    // Only proceed if isActive status changed and data exists
    if (!newData || !previousData || newData.isActive === previousData.isActive) {
      return;
    }

    try {
      // Update Auth status
      await admin.auth().updateUser(event.params.userId, {
        disabled: !newData.isActive
      });
      
      logger.info(`User ${event.params.userId} auth status updated to ${!newData.isActive}`);
    } catch (error) {
      logger.error('Error updating user:', error);
      // Revert Firestore change if Auth update fails
      if (event.data?.after.ref) {
        await event.data.after.ref.update({ isActive: previousData.isActive });
      }
      throw new Error('Failed to sync user status with authentication system');
    }
  }
);