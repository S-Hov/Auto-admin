FROM node:20-alpine

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код проекта
COPY . .

# Открываем порт для Vite/CRA (обычно 5174 или 3000)
EXPOSE 5174

# Запускаем сервер
CMD ["npm", "run", "dev"]