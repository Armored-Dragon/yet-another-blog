FROM node:21-bullseye-slim

WORKDIR /app
RUN apt-get update || : && apt-get install -y netcat-openbsd

COPY package.json .
COPY prisma ./prisma/

RUN npm install

COPY . .

EXPOSE 5004

COPY wait-for-db.sh /usr/local/bin/wait-for-db.sh

RUN chmod +x /usr/local/bin/wait-for-db.sh

CMD ["/usr/local/bin/wait-for-db.sh"]
