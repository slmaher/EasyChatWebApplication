# Build stage
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Copy frontend source code
COPY frontend/ .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 