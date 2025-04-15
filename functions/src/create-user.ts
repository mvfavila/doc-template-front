import { https, logger } from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/v2/https';
import { auth, db } from './shared/firebase-admin'; // Import from shared file
import { FieldValue } from 'firebase-admin/firestore';

interface CreateUserData {
  name: string
  email: string
  password: string
  officeId: string
  role: 'office_admin' | 'customer'
}

export const createUser = https.onCall(async (request: CallableRequest<CreateUserData>) => {
  // Log the start of the function
  logger.log('createUser function called', { auth: request.auth, data: request.data })

  // Verify the user is logged in
  if (!request.auth) {
    logger.warn('Unauthenticated request attempt')
    throw new https.HttpsError(
      'unauthenticated',
      'You must be logged in to perform this action'
    )
  }

  const { name, email, password, officeId, role } = request.data

  // Get the caller's user document
  const userDoc = await db.doc(`users/${request.auth.uid}`).get()
  
  if (!userDoc.exists || (request.auth.token.role !== 'system_admin' && request.auth.token.role !== 'office_admin')) {
    logger.warn('Permission denied - invalid role for user creation', { uid: request.auth.uid })
    // Only system admins or office admins can create users
    throw new https.HttpsError(
      'permission-denied',
      'This role cannot create users'
    )
  }

  if ((role === 'customer' && request.auth.token.role !== 'office_admin') || (role === 'office_admin' && request.auth.token.role !== 'system_admin')) {
    logger.warn('Permission denied - insufficient privileges for requested role', {
      uid: request.auth.uid,
      callerRole: request.auth.token.role,
      requestedRole: role
    })
    throw new https.HttpsError(
      'permission-denied',
      'You do not have permission to create this user'
    )
  }

  try {
    logger.log('Attempting to create user', { email, role, officeId })

    // 1. Create user without signing in
    const userRecord = await auth.createUser({
      email,
      password,
    })

    await auth.setCustomUserClaims(userRecord.uid, {
      role: role,
      officeId: officeId
    });

    logger.log('Auth user created successfully', { uid: userRecord.uid })

    // 2. Create user document
    await db.doc(`users/${userRecord.uid}`).set({
      name,
      email,
      role,
      officeId,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    })

    logger.log('User document created successfully', { uid: userRecord.uid })
    return { success: true, uid: userRecord.uid }
  } catch (error) {
    logger.error('User creation failed', error)
    throw new https.HttpsError('internal', 'User creation failed', error)
  }
})