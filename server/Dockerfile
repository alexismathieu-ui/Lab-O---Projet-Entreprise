FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copie le backend ET les fichiers HTML dans public/
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
