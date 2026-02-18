FROM node:20-alpine

WORKDIR /app

# Instalar dependencias de producción necesarias
RUN apk add --no-cache \
    # Para compilar módulos nativos si fuera necesario
    python3 \
    make \
    g++

# Copiar package files primero para mejor cache de Docker
COPY package*.json ./

# Instalar dependencias
RUN npm ci --omit=dev

# Copiar código fuente
COPY boot.mjs ./
COPY index.js ./

# Crear directorio de uploads con permisos
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Exponer puerto
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Iniciar aplicación
CMD ["node", "boot.mjs"]
