FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

FROM base AS build
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build

FROM base AS prod
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 4000
CMD ["node", "dist/main"]
