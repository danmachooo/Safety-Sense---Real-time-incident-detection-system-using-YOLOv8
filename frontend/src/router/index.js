import { createRouter, createWebHistory } from "vue-router";

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

const routes = [
  {
    path: "/admin",
    component: AdminLayout,
    children: [
      // Dashboard route - added as the default/index route
      { path: "", redirect: "dashboard" }, // Redirect /admin to /admin/dashboard
      { path: "dashboard", component: Dashboard },

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
    component: LoginForm,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
