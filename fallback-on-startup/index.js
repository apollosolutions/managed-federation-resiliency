import dotenv from "dotenv";
import { ApolloServer } from "apollo-server";
import { ApolloGateway, getDefaultFetcher } from "@apollo/gateway";
import { readFile } from "fs/promises";
import { UplinkFetcherWithInitialSupergraph } from "./UplinkFetcherWithInitialSupergraph.js";

dotenv.config({ debug: true });

const uplinkEndpoints = process.env.APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT
  ? process.env.APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT.split(",")
  : [
      "https://uplink.api.apollographql.com/",
      "https://aws.uplink.api.apollographql.com/",
    ];

const server = new ApolloServer({
  gateway: new ApolloGateway({
    debug: true,
    supergraphSdl: new UplinkFetcherWithInitialSupergraph({
      apiKey: process.env.APOLLO_KEY,
      graphRef: process.env.APOLLO_GRAPH_REF,
      uplinkEndpoints,
      maxRetries: uplinkEndpoints.length * 3 - 1,
      fallbackPollIntervalInMs: 10_000,
      fetcher: getDefaultFetcher(),
      logger: console,
      subgraphHealthCheck: undefined,

      // This function could read the supergraph from cloud storage or any
      // other cache.

      initialSupergraphSdl() {
        return readFile("supergraph.graphql", "utf-8");
      },
    }),
  }),
});

const { url } = await server.listen(process.env.PORT ?? 4000);
console.log(`gateway listening on ${url}`);
