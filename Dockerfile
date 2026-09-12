# FORTIXAM v8 — bundle standalone de producción
# Este Dockerfile asume que `npm run build:web` ya se ejecutó y
# .next-standalone/standalone/ contiene server.js + static + public.
# Compila en cualquier máquina con Node 22 y solo copia el bundle final.

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copiar el bundle standalone (server.js, chunks, public, node_modules trazado)
COPY .next-standalone/standalone ./

EXPOSE 3000

CMD ["node", "server.js"]