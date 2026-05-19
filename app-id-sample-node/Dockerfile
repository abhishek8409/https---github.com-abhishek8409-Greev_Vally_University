FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json first to check if an npm install is needed
COPY package.json ./
RUN npm install --production

# Bundle app source
COPY ..

ENV PORT 80
EXPOSE 80

CMD ["node","app.js"]
