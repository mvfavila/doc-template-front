import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "test-project",
    firestore: {
      rules: `service cloud.firestore {
        match /databases/{database}/documents {
          match /users/{userId} {
            allow read: if request.auth != null && request.auth.uid == userId;
          }
        }
      }`
    }
  });
});

test('cannot read other users data', async () => {
  const alice = testEnv.authenticatedContext("alice");
  const bobData = doc(getFirestore(alice), 'users', 'bob');
  await assertFails(getDoc(bobData));
});

afterAll(async () => {
  await testEnv.cleanup();
});