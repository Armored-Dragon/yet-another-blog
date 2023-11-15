FROM node:21-bullseye-slim

WORKDIR /app

RUN apt-get update || : && apt-get install -y 

COPY package.json .

EXPOSE 5004

COPY . .

RUN npm install

RUN npx prisma generate

CMD ["npm", "start"]
