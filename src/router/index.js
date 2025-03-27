import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home.vue";
import SignIn from "@/views/SignIn.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    meta: { public: true }, // Accessible without auth
  },
  {
    path: "/signin",
    name: "SignIn",
    component: SignIn,
    meta: { public: true },
  },
  // Add your protected routes here...
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Optional: Add navigation guard for protected routes
router.beforeEach((to, from, next) => {
  const requiresAuth = !to.meta.public;
  const isAuthenticated = /* your auth check logic */ false;

  if (requiresAuth && !isAuthenticated) {
    next("/signin");
  } else {
    next();
  }
});

export default router;
