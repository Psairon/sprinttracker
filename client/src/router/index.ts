import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '../api/client';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'projects',
    component: () => import('../views/ProjectsView.vue'),
  },
  {
    path: '/team',
    name: 'team',
    component: () => import('../views/TeamView.vue'),
  },
  {
    path: '/projects/:projectId',
    name: 'sprints',
    component: () => import('../views/SprintsView.vue'),
    props: true,
  },
  {
    path: '/sprints/:sprintId',
    name: 'board',
    component: () => import('../views/BoardView.vue'),
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (!to.meta.public && !getToken()) {
    return { name: 'login' };
  }
  if (to.name === 'login' && getToken()) {
    return { name: 'projects' };
  }
});

export default router;
