FROM node:20-alpine

WORKDIR /app

# install deps
COPY package.json package-lock.json* ./
RUN npm install --production --no-audit --no-fund

# copy source
COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["node", "api/index.js"]
