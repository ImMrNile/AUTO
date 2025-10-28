# Multi-stage build для оптимизации размера образа
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

# Устанавливаем зависимости
RUN npm ci --only=production && \
    npm ci --only=development

# Копируем исходный код
COPY src ./src
COPY lib ./lib
COPY public ./public
COPY prisma ./prisma
COPY mcp-product-parser ./mcp-product-parser

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем приложение
RUN npm run build

# Production образ
FROM node:18-alpine

WORKDIR /app

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Копируем package files
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production

# Копируем Prisma schema и миграции
COPY prisma ./prisma

# Копируем собранное приложение из builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose порт
EXPOSE 3000

# Запуск приложения
CMD ["npm", "start"]
