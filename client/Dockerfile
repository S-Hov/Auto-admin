FROM node:20-alpine

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код проекта
COPY . .

# Открываем порт для Vite/CRA (обычно 5173 или 3000)
EXPOSE 5173

# Запускаем dev-сервер с флагом --host (это критично для Docker!)
CMD ["npm", "run", "dev", "--", "--host"]
