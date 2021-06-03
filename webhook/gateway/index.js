import { ApolloServer } from "apollo-server";
import { ApolloGateway } from "@apollo/gateway";
import fetcher from "make-fetch-happen";

// disable caching and retries for faster testing. not necessary in production.
const customFetcher = fetcher.defaults({
  headers: {
    "apollographql-client-name": "@apollo/gateway",
    "apollographql-client-version": "0.28.2",
    "user-agent": `@apollo/gateway/0.28.2`,
    "content-type": "application/json",
  },
  retry: false,
});

const wrappedFetcher = async (req, init) => {
  const resp = await customFetcher(req, init);
  if (!resp.ok) {
    console.log("*** schema update request failed, using backup ***");
    return fetcher(process.env.SDL_BACKUP_ENDPOINT);
  } else {
    return resp;
  }
};

const gateway = new ApolloGateway({
  debug: true,
  fetcher: wrappedFetcher,
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
});

server
  .listen({ port: process.env.PORT ?? "4000" })
  .then(({ url }) => console.log(`listening on ${url}`));
