FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads

ENV PORT=3456
EXPOSE 3456

CMD ["node", "server.js"]
