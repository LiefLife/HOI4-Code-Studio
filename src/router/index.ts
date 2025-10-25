import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/create-project',
      name: 'create-project',
      component: () => import('../views/CreateProject.vue')
    },
    {
      path: '/recent-projects',
      name: 'recent-projects',
      component: () => import('../views/RecentProjects.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue')
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('../views/Editor.vue')
    }
  ]
})

export default router
