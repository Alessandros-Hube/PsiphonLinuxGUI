FROM electronuserland/builder:latest

WORKDIR /app

COPY package*.json ./

COPY . .

CMD ["npm", "run", "build"]
