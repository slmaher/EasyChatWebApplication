FROM node:18-alpine

# Install Nginx and Supervisor
RUN apk add --no-cache nginx supervisor

# Set up working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Copy all source code (including backend before npm install)
COPY frontend ./frontend
COPY backend ./backend

# Now install dependencies
RUN npm install --prefix backend
RUN npm install --prefix frontend

# Build frontend
RUN npm run build --prefix frontend

# Copy built frontend to Nginx html directory
RUN mkdir -p /var/www/html
RUN cp -r ./frontend/dist/* /var/www/html/

# Copy Nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy Supervisor config
COPY supervisord.conf /etc/supervisord.conf

# Expose ports (80 for frontend, 5001 for backend example)
EXPOSE 80 5001

# Start both Nginx and backend using Supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"] 