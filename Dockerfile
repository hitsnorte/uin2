# Use an official Node.js runtime as a base image
FROM node:20-buster

# Set the working directory in the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy entire project (including server.js and prisma folder)
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build your Next.js application
RUN npm run build

# Expose the app port
EXPOSE 3000

# Start the application using your custom Express server
CMD ["npm", "run", "start"]