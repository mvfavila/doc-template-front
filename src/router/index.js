import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home.vue";
import SignIn from "@/views/SignIn.vue";
import OfficeAdminLandingPage from "@/views/OfficeAdminLandingPage.vue";
import Dashboard from "@/views/Dashboard.vue";
import { getAuth } from "@firebase/auth";
import { getDoc, doc } from "@firebase/firestore";
import { db } from '@/firebase';

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
    path: '/admin',
    component: OfficeAdminLandingPage,
    meta: { requiresAuth: true, forAdmin: true }
  },
  {
    path: '/dashboard',
    component: Dashboard,
    meta: { requiresAuth: true, forCustomer: true }
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
  const auth = getAuth();
  const user = auth.currentUser;

  // If no user is logged in and route requires auth, redirect to login
  if (to.meta.requiresAuth && !user) {
    next('/login');
    return;
  }

  // If user is logged in
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Redirect based on role
        if (userData.role === 'customer' && to.meta.forAdmin) {
          next('/dashboard'); // Customer trying to access admin page
          return;
        }
        
        if (userData.role === 'office_admin' && to.meta.forCustomer) {
          next('/admin'); // Admin trying to access customer page
          return;
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  }

  next();
});

export default router;
