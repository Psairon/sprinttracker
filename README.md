# 🏃 Sprint Tracker

Монолитный спринт-трекер: **NestJS + TypeORM (SQLite) + Vue 3 (Naive UI + Tailwind)**.
Бэкенд раздаёт собранный фронт и REST API под префиксом `/api`.

## Возможности

- **Аутентификация** — простая регистрация/вход по email + пароль (JWT, 30 дней).
- **Проекты** — у проекта есть владелец; внутри живут спринты.
- **Спринты** — в проекте; можно **пригласить пользователя по email** и выдать ему
  доступ к спринту. Ролей нет: доступ = членство.
- **Задачи** — оценка в часах, статусы `todo / in_progress / done`,
  **drag & drop** между колонками доски.
- **Подзадачи рабочих групп** — треки `Аналитика / Бэкенд / Фронтенд / DevOps / Прочее`,
  свой статус, оценка и **персональный дедлайн** (иначе берётся дедлайн спринта).
- **Спидометры** — общий гейдж «сколько задач выполнено» + часы в незакрытых задачах,
  и отдельные гейджи по каждой рабочей группе.
- **Горящие задачи** — подзадача «в работе» дольше дедлайна (по умолчанию 5 дней,
  настраивается на спринт или персонально) подсвечивается 🔥.

## Структура

```
server/   NestJS + TypeORM + SQLite (sql.js) — API + раздача фронта
client/   Vue 3 (Vite, Pinia, vue-router, Naive UI, Tailwind)
```

> SQLite реализован через драйвер TypeORM `sqljs` (чистый WASM/JS), чтобы не требовать
> нативной компиляции `better-sqlite3` (на машине нет C++ build tools). База лежит в
> `server/data/sprinttraker.sqlite` и автосохраняется.

## Запуск

### Установка
```bash
npm run install:all
```

### Прод (монолит: один процесс на http://localhost:3000)
```bash
npm run build      # собирает client, затем server
npm start          # node server/dist/main.js
```

### Разработка (два процесса с hot-reload)
```bash
npm run dev:server   # NestJS на :3000 (watch)
npm run dev:client   # Vite на :5173, проксирует /api → :3000
```

## Переменные окружения (необязательно)
- `PORT` — порт сервера (по умолчанию `3000`).
- `JWT_SECRET` — секрет для подписи токенов (по умолчанию dev-значение).

## API (кратко)

| Метод | Путь | Описание |
|------|------|----------|
| POST | `/api/auth/register` `/login` | регистрация / вход |
| GET  | `/api/auth/me` | текущий пользователь |
| GET/POST | `/api/projects` | список / создание проектов |
| GET/POST | `/api/projects/:id/sprints` | спринты проекта |
| PATCH | `/api/sprints/:id` | дедлайн спринта |
| GET | `/api/sprints/:id/members` | участники |
| POST | `/api/sprints/:id/invite` | пригласить по email |
| GET/POST | `/api/sprints/:id/tasks` | задачи спринта |
| PATCH/DELETE | `/api/tasks/:id` | задача (в т.ч. смена статуса) |
| POST | `/api/tasks/:id/subtasks` | создать подзадачу |
| PATCH/DELETE | `/api/subtasks/:id` | подзадача |
| GET | `/api/sprints/:id/stats` | агрегаты для спидометров |

Все эндпоинты, кроме `register`/`login`, требуют заголовок `Authorization: Bearer <token>`.
