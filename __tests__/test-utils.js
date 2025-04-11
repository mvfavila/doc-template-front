export async function createTestUser(email, password) {
  const response = await fetch(
    "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulated",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  return await response.json();
}

export async function clearAuth() {
  await fetch(
    "http://localhost:9099/emulator/v1/projects/doc-template-front-dev/accounts",
    {
      method: "DELETE",
    }
  );
}
