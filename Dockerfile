# --- Installing stage
FROM node:14 as installer

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm ci

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# ---

# Installing prod node_modules
FROM installer AS prod_installer
## Workdir is shared between the stage so let's reuse it as we neeed the packages
WORKDIR /usr/src/app_prod

COPY package*.json ./

RUN npm ci --only=production

# ---

# Building stage
FROM installer AS builder

## Workdir is shared between the stage so let's reuse it as we neeed the packages
WORKDIR /usr/src/app

COPY ./src src
COPY tsconfig.json .

RUN npm run build

# ---

FROM node:14-slim

WORKDIR /app

COPY --from=prod_installer --chown=node:node /usr/src/app_prod/node_modules node_modules

COPY --from=builder --chown=node:node /usr/src/app/dist build

USER node
