FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve with a simple static server
FROM node:20-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=build /app/dist .

EXPOSE 5173
CMD ["serve", "-s", ".", "-l", "5173"]
