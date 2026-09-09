FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Generar Prisma Client
RUN npx prisma generate
EXPOSE 80
CMD ["npm", "start"]
