import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home.vue";
import BrowserView from "@/views/BrowserView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/browser",
    name: "Browser",
    component: BrowserView,
    meta: {
      keepAlive: true,
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
