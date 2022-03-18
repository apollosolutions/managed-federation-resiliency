FROM node:16
WORKDIR /web
COPY package.json yarn.lock /web
RUN yarn install
COPY .env index.js UplinkFetcherWithInitialSupergraph.js supergraph.graphql /web
CMD node index.js
