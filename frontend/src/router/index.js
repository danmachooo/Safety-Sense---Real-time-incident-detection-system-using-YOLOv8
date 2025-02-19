import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "../layouts/AdminLayout.vue";

import ViewUsers from "../views/admin/users/ViewUsers.vue";
import CreateUser from "../views/admin/users/CreateUser.vue";
import UpdateUser from "../views/admin/users/UpdateUser.vue";

// import ViewInventory from "../views/admin/inventory/ViewInventory.vue";
// import CreateInventory from "../views/admin/inventory/CreateInventory.vue";
// import UpdateInventory from "../views/admin/inventory/UpdateInventory.vue";

const routes = [
  {
    path: "/admin",
    component: AdminLayout,
    children: [
      { path: "users/view", component: ViewUsers },
      { path: "users/create", component: CreateUser },
      { path: "users/update", component: UpdateUser },

    //   { path: "inventory/view", component: ViewInventory },
    //   { path: "inventory/create", component: CreateInventory },
    //   { path: "inventory/update", component: UpdateInventory },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
