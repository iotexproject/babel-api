FROM node:14

WORKDIR /app

COPY ["package.json", "package-lock.json*", "tsconfig.json", "./"]

COPY src /app/src

RUN npm install
RUN npm run build

EXPOSE 8545

CMD [ "node", "dist/api.js" ]