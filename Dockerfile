FROM electronuserland/builder:latest

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .