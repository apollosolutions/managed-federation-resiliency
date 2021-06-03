FROM node:14
WORKDIR /web
COPY package.json yarn.lock /web
RUN yarn
COPY . /web
CMD yarn start
