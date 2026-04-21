# Use a mirror if Docker Hub is inaccessible
FROM docker.m.daocloud.io/library/node:18-alpine
# FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
# Use Aliyun mirror for NPM
RUN npm config set registry https://registry.npmmirror.com && npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
