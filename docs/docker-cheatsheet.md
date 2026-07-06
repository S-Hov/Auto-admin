# Docker — Полезные команды

Проект: `auto_admin`  
Сервисы: `mysql`, `adminer`, `client`, `server`

---

## 🚀 Запуск и остановка

| Команда | Описание |
|---|---|
| `docker compose up` | Запустить все сервисы (фоновый режим по умолчанию в newer compose) |
| `docker compose up -d` | Запустить в **detached** режиме (фон) |
| `docker compose down` | Остановить и удалить все контейнеры, сети |
| `docker compose down -v` | Остановить + **удалить тома** (данные MySQL будут потеряны!) |
| `docker compose restart` | Перезапустить все сервисы |
| `docker compose stop` | Остановить контейнеры (без удаления) |
| `docker compose start` | Запустить остановленные контейнеры |

---

## 🔧 Запуск отдельных сервисов

| Команда | Описание |
|---|---|
| `docker compose up -d server` | Запустить **только** сервер |
| `docker compose up -d client` | Запустить **только** клиент |
| `docker compose up -d mysql` | Запустить **только** базу данных |
| `docker compose up -d adminer` | Запустить **только** Adminer |
| `docker compose up -d --build server` | Пересобрать образ и запустить сервис |

---

## 📋 Просмотр состояния

| Команда | Описание |
|---|---|
| `docker compose ps` | Список контейнеров и их статус |
| `docker compose ps server` | Статус конкретного сервиса |
| `docker compose logs` | Логи всех сервисов |
| `docker compose logs -f server` | **Подписаться** на логи сервера в реальном времени |
| `docker compose logs -f --tail=100 server` | Последние 100 строк логов сервера |
| `docker compose logs -f --tail=0 server` | Только новые строки (без истории) |

### Отдельные контейнеры

```powershell
docker logs -f auto_admin_server        # Логи сервера
docker logs -f --tail=50 auto_admin_client  # Последние 50 строк клиента
docker inspect auto_admin_mysql         # Полная информация о контейнере
```

---

## 🗑️ Очистка

### Удалить все контейнеры и образы

```powershell
# Остановить и удалить всё
docker compose down

# Удалить все остановленные контейнеры
docker container prune

# Удалить все неиспользуемые образы
docker image prune -a

# Удалить все неиспользуемые тома
docker volume prune -a

# Удалить всё сразу (контейнеры, образы, тома, сети)
docker system prune -a --volumes
```

### Очистить кэш сборки

```powershell
# Пересобрать образ с очисткой кэша
docker compose build --no-cache

# Пересобрать конкретный сервис
docker compose build --no-cache server
```

### Удалить данные MySQL (сброс БД)

```powershell
# Вариант 1: удалить том через compose
docker compose down -v
docker compose up -d

# Вариант 2: удалить том вручную
docker volume rm auto_admin_mysql_data
```

---

## 💻 Вход в контейнер

```powershell
# BASH в контейнере сервера
docker exec -it auto_admin_server sh

# BASH в контейнере клиента
docker exec -it auto_admin_client sh

# BASH в контейнере MySQL
docker exec -it auto_admin_mysql bash

# Выполнить команду в контейнере
docker exec auto_admin_server node --version
docker exec auto_admin_client npm run build
```

---

## 🔄 Пересборка и обновление

```powershell
# Пересобрать все образы
docker compose build

# Пересобрать один сервис
docker compose build server

# Пересобрать и запустить
docker compose up -d --build

# Пересобрать конкретный сервис и запустить
docker compose up -d --build server

# Обновить образ (pull + re-create)
docker compose pull
docker compose up -d
```

---

## 🌐 Порты сервисов

| Сервис | Порт | URL |
|---|---|---|
| **Client (React)** | `5177` | http://localhost:5177 |
| **Server (Node.js)** | `5180` | http://localhost:5180 |
| **MySQL** | `3307` | localhost:3307:3306 |
| **Adminer** | `8080` | http://localhost:8080 |

---

## 🛠️ Полезные_one-liners_

```powershell
# Посмотреть все контейнеры (включая остановленные)
docker ps -a

# Найти IP контейнера
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' auto_admin_server

# Мониторинг ресурсов
docker stats

# Очистить только логи контейнеров
docker compose logs -f --tail=0 server

# Проверить конфигурацию compose
docker compose config

# Показать дерево зависимостей
docker compose config --services
```

---

## 📝 MySQL

```powershell
# Подключиться к MySQL
docker exec -it auto_admin_mysql mysql -u root -proot auto_admin_test

# Подключиться через Adminer
# http://localhost:8080
# server: mysql
# user: root
# password: root
# database: auto_admin_test
```
