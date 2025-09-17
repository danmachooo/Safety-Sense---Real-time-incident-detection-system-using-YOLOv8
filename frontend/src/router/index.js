import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/authStore";

import AdminLayout from "../layouts/AdminLayout.vue";
import LoginForm from "../components/LoginForm.vue";
import Dashboard from "../views/Dashboard.vue";
import ViewUsers from "../views/admin/users/ViewUsers.vue";
import CreateUser from "../views/admin/users/CreateUser.vue";
import ArchivedUsers from "../views/admin/users/ArchivedUsers.vue";
import LoginHistory from "../views/admin/users/LoginHistory.vue";
import Profile from "../views/admin/users/UserProfile.vue";
import AdminProfile from "../views/admin/users/AdminProfile.vue";

import Batches from "../views/admin/inventory/Batches.vue";
import Categories from "../views/admin/inventory/Categories.vue";
import Deployments from "../views/admin/inventory/Deployments.vue";
import InventoryItems from "../views/admin/inventory/InventoryItems.vue";
import Notifications from "../views/admin/inventory/Notifications.vue";

import ManageCamera from "../views/admin/camera/ManageCamera.vue";
import CameraDetail from "../views/admin/camera/CameraDetail.vue";
import ArchivedCamera from "../views/admin/camera/ArchivedCamera.vue";
import Reports from "../views/Reports.vue";

const routes = [
  {
    path: "/admin",
    component: AdminLayout,
    meta: { requiresAuth: true }, // Protect all admin routes
    children: [
      // Dashboard route - added as the default/index route
      { path: "", redirect: "dashboard" }, // Redirect /admin to /admin/dashboard
      { path: "dashboard", component: Dashboard },
      { path: "reports", component: Reports },

      // User Management routes
      { path: "users/view", component: ViewUsers },
      { path: "users/create", component: CreateUser },
      { path: "users/archived", component: ArchivedUsers },
      { path: "users/login-history", component: LoginHistory },
      { path: "users/profile/:id", component: Profile, props: true },
      { path: "users/profile/me", component: AdminProfile, props: true },

      // Inventory Management routes
      { path: "inventory/items", component: InventoryItems },
      { path: "inventory/categories", component: Categories },
      { path: "inventory/batches", component: Batches },
      { path: "inventory/deployments", component: Deployments },
      { path: "inventory/notifications", component: Notifications },

      // Camera Management routes
      { path: "camera/manage", component: ManageCamera },
      { path: "camera/detail/:id", component: CameraDetail, props: true },
      { path: "camera/archived", component: ArchivedCamera },
    ],
  },
  {
    path: "/",
    name: "login",
    component: LoginForm,
    meta: { requiresGuest: true }, // Only allow non-authenticated users
  },
  {
    path: "/login",
    name: "loginAlias",
    component: LoginForm,
    meta: { requiresGuest: true },
  },
  // Catch-all route for 404 - redirect to login or dashboard based on auth status
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    redirect: (to) => {
      const authStore = useAuthStore();
      return authStore.isAuthenticated ? "/admin/dashboard" : "/";
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Check if route requires authentication
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);

  // If user is authenticated and trying to access guest-only routes (login)
  if (requiresGuest && authStore.isAuthenticated) {
    return next("/admin/dashboard");
  }

  // If route requires auth but user is not authenticated
  if (requiresAuth && !authStore.isAuthenticated) {
    // Try to refresh the token first
    try {
      if (authStore.accessToken) {
        // If we have a token, try to refresh it
        await authStore.refreshToken();

        // If refresh was successful, allow navigation
        if (authStore.isAuthenticated) {
          return next();
        }
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Clear any invalid auth state
      authStore.clearAuthState();
    }

    // If still not authenticated, redirect to login
    return next({
      path: "/",
      query: { redirect: to.fullPath }, // Save the intended destination
    });
  }

  // Allow navigation
  next();
});

export default router;
