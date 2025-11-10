# ---------------------------
# 🏗️  Build stage
# ---------------------------
FROM node:20-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Declarar as variáveis de ambiente que virão do Easypanel
# (elas são passadas via --build-arg automaticamente)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Tornar as variáveis disponíveis no ambiente de build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Instalar dependências (usando cache inteligente)
RUN npm ci || npm install

# Copiar o restante dos arquivos do projeto
COPY . .

# Compilar o app com as variáveis de ambiente
RUN npm run build


# ---------------------------
# 🚀  Production stage
# ---------------------------
FROM nginx:alpine

# Copiar os arquivos gerados pelo build para o diretório público do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx (caso exista)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor a porta padrão do Nginx
EXPOSE 80

# Rodar o servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
