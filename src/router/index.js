import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home.vue";
import SignIn from "@/views/SignIn.vue";
import { useAuth } from "@/composables/useAuth";

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
  {
    path: "/system-admin",
    name: "SystemAdmin",
    component: () => import("@/views/SystemAdminDashboard.vue"),
    meta: { requiresAuth: true, roles: ["system_admin"] },
  },
  {
    path: "/office-admin",
    name: "OfficeAdmin",
    component: () => import("@/views/OfficeAdminDashboard.vue"),
    meta: { requiresAuth: true, roles: ["office_admin"] },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const { user, isLoading } = useAuth();

  // Wait for auth to initialize
  while (isLoading.value) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (to.meta.requiresAuth && !user.value) {
    next("/signin");
  } else if (to.meta.roles && !to.meta.roles.includes(user.value?.role)) {
    next("/unauthorized");
  } else {
    next();
  }
});

export default router;
