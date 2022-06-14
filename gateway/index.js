import { ApolloServer } from "apollo-server-lambda";
import { ApolloGateway, UplinkSupergraphManager } from "@apollo/gateway";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { streamToString } from "./stream.js";

const client = new S3Client({
  region: process.env.FALLBACK_BUCKET_REGION,
});

/** @type {import("aws-lambda").Handler | undefined} */
let memoizedHandler;

/**
 * Because we have to fetch the APOLLO_KEY from the AWS secrets manager,
 * creating the server has to be async. This function generates and caches the
 * apollo server and gateway instances for use in the actual lambda
 * handler function.
 * @returns {Promise<import("aws-lambda").Handler>}
 */
async function createHandler() {
  if (!memoizedHandler) {
    const key = await getApolloKey();

    const server = new ApolloServer({
      apollo: { key },
      gateway: new ApolloGateway({
        supergraphSdl: new UplinkSupergraphManager({
          fetcher: (_url, _init) => {
            throw new Error("purposefully breaking Uplink");
          },
          maxRetries: 1,

          apiKey: key,
          graphRef: /** @type {string} */ (process.env.APOLLO_GRAPH_REF),

          async onFailureToFetchSupergraphSdlDuringInit({
            error,
            graphRef,
            fetchCount,
            logger,
          }) {
            logger.warn(`uplink fetch error: ${error}`);
            return fetchFallbackSupergraph(graphRef, logger);
          },
        }),
      }),
    });

    memoizedHandler = server.createHandler();
  }

  return memoizedHandler;
}

/** @type {import("aws-lambda").Handler} */
export async function handler(event, context, callback) {
  return (await createHandler())(event, context, callback);
}

// ****************************************************************************
// fallback supergraph fetch from S3
// ****************************************************************************

/**
 * @param {string} graphRef
 * @param {import("apollo-server-types").Logger} logger
 */
async function fetchFallbackSupergraph(graphRef, logger) {
  const objectKey = `${graphRef}.graphql`;
  logger.info(`fetching ${objectKey} from ${process.env.FALLBACK_BUCKET_NAME}`);

  const obj = await client.send(
    new GetObjectCommand({
      Bucket: process.env.FALLBACK_BUCKET_NAME,
      Key: objectKey,
    })
  );

  if (!obj || !obj.Body) {
    throw new Error("missing object in cloud storage");
  }

  const sdl = await streamToString(obj.Body);
  console.log(sdl);
  return sdl;
}

// ****************************************************************************
// secrets management for the Apollo API key
// ****************************************************************************

const secretsClient = new SecretsManagerClient({});

/** @type {string | undefined} */
let memoizedSecretValue;

/**
 * @returns {Promise<string>}
 */
async function getApolloKey() {
  if (!memoizedSecretValue) {
    const command = new GetSecretValueCommand({
      SecretId: process.env.APOLLO_KEY_ARN,
    });

    const resp = await secretsClient.send(command);
    memoizedSecretValue = resp.SecretString;
  }

  return /** @type {string} */ (memoizedSecretValue);
}
