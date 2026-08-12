FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .
	
EXPOSE 3075

CMD["node", "server.js"]
