FROM node:21-slim

WORKDIR /app

# COPY data /app/data
COPY tools /app

RUN npm ci

# CMD /usr/local/bin/node /app/xls2gql.mjs ${DB_URI}
CMD /usr/local/bin/node /app/webhook.mjs
