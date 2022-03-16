FROM node:14

WORKDIR /app

COPY ["package.json", "package-lock.json*", "tsconfig.json", "./"]

COPY src /app/src

RUN npm install github:barrysteyn/node-scrypt#fb60a8d3c158fe115a624b5ffa7480f3a24b03fb
RUN npm install
RUN npm run build

EXPOSE 8545

CMD [ "node", "dist/api.js" ]
