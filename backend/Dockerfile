FROM node:20

WORKDIR /app

# install deps
COPY package.json package-lock.json* ./
# Install dependencies (dev + prod) to ensure all transitive deps present
RUN npm install --no-audit --no-fund \
	&& npm install depd@2 body-parser@1.20.2 --no-audit --no-fund

# copy source
COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["node", "api/index.js"]
