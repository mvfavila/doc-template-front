import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { auth } from './shared/firebase-admin';

interface AdminClaims {
  [key: string]: unknown;
}

export const syncAdminClaims = onDocumentCreated(
  'admins/{uid}',
  async (event) => {
    const uid = event.params.uid;
    const claims = event.data?.data() as AdminClaims;

    logger.log('Processing admin claims', { uid, claims });

    if (!claims || Object.keys(claims).length === 0) {
      logger.error('No claims found in document');
      return;
    }

    try {
      await auth.setCustomUserClaims(uid, claims);
      logger.log('Claims set successfully', { uid });

      await event.data?.ref.delete();
      logger.log('Admin document deleted', { uid });

    } catch (error) {
      logger.error('Failed to sync claims', { uid, error });
      throw error;
    }
  }
);