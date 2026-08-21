FROM node:20-alpine

WORKDIR /app

# Сначала копируем только манифесты зависимостей (для эффективного кэширования слоёв Docker)
COPY package*.json ./

# В проде и CI всегда используют npm ci вместо npm install (гарантирует установку точных версий)
RUN npm install

# Копируем остальной исходный код
COPY . .

# Даем права пользователю node
RUN chown -R node:node /app

USER node

EXPOSE 5173

CMD ["npm", "run", "dev"]