FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:contracts && chown -R node:node /app
USER node
EXPOSE 5174
CMD ["npm", "run", "dev", "--workspace=server"]
