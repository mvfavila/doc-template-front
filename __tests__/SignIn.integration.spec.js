import { render, fireEvent, screen } from "@testing-library/vue";
import SignIn from "@/views/SignIn.vue";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "firebase/auth";
import { createRouter, createMemoryHistory } from 'vue-router';

// Initialize test app connected to emulators
const testApp = initializeApp({
  apiKey: "test-api-key",
  authDomain: "test.firebaseapp.com",
  projectId: "doc-template-front-dev",
});

const auth = getAuth(testApp);
connectAuthEmulator(auth, "http://localhost:9099");

// Mock router-link
const mockRouterLink = {
  template: "<a><slot></slot></a>",
};

describe("SignIn.vue - Integration", () => {
  let router;

  beforeAll(async () => {
    // Clear auth emulator before all tests
    await fetch(
      "http://localhost:9099/emulator/v1/projects/doc-template-front-dev/accounts",
      {
        method: "DELETE",
      }
    );

    // Create test router
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/signin', component: { template: '<div>SignIn</div>' } },
        { path: '/dashboard', component: { template: '<div>Dashboard</div>' } }
      ]
    });

    await router.push('/signin');

    // Create the test user using Firebase SDK
    await createUserWithEmailAndPassword(auth, 'test@lawfirm.com', 'Test123!');
  });

  it('successfully signs in with valid credentials', async () => {
    // Mock the router push function
    const push = vi.fn();
    router.push = push;
    
    render(SignIn, {
      global: {
        plugins: [router],
        components: {
          'router-link': mockRouterLink
        },
      }
    });

    await fireEvent.update(screen.getByLabelText('E-mail'), 'test@lawfirm.com');
    await fireEvent.update(screen.getByLabelText('Senha'), 'Test123!');
    await fireEvent.click(screen.getByText('Entrar'));

    await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        }
      });
    });

    // Verify auth state if needed
    expect(auth.currentUser).not.toBeNull();
    expect(auth.currentUser.email).toBe('test@lawfirm.com');
  });
});
