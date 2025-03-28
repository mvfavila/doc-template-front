import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home.vue";
import SignIn from "@/views/SignIn.vue";
import { auth } from "@/firebase"; // Changed import

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    meta: { public: true },
  },
  {
    path: "/signin",
    name: "SignIn",
    component: SignIn,
    meta: { public: true },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: () => import("@/views/Dashboard.vue"),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isPublic = to.matched.some((record) => record.meta.public);

  if (requiresAuth) {
    const user = auth.currentUser; // Now using the centralized auth instance
    if (user) {
      next();
    } else {
      next("/signin"); // Changed from '/login' to match your route
    }
  } else if (isPublic) {
    next();
  } else {
    next("/");
  }
});

export default router;
