import { https } from 'firebase-functions'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { CallableRequest } from 'firebase-functions/v2/https'

const app = initializeApp()
const auth = getAuth(app)
const db = getFirestore(app)

interface CreateOfficeAdminData {
  email: string
  password: string
  officeId: string
}

export const createOfficeAdmin = https.onCall(async (request: CallableRequest<CreateOfficeAdminData>) => {
  // Verify system admin is making this request
  if (!request.auth) {
    throw new https.HttpsError(
      'unauthenticated',
      'You must be logged in to perform this action'
    )
  }

  // Get the caller's user document
  const userDoc = await db.doc(`users/${request.auth.uid}`).get()
  
  if (!userDoc.exists || userDoc.data()?.role !== 'system_admin') {
    throw new https.HttpsError(
      'permission-denied',
      'Only system admins can create office admins'
    )
  }

  const { email, password, officeId } = request.data

  try {
    // 1. Create user without signing in
    const userRecord = await auth.createUser({
      email,
      password,
    })

    // 2. Create user document
    await db.doc(`users/${userRecord.uid}`).set({
      email,
      role: 'office_admin',
      officeId,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    })

    return { success: true, uid: userRecord.uid }
  } catch (error) {
    throw new https.HttpsError('internal', 'User creation failed', error)
  }
})