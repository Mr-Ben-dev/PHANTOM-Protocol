FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY keeper.ts cofhe.ts rpc.ts ./

EXPOSE 10000

CMD ["npm", "start"]
