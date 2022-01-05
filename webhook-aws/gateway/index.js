import { ApolloServer } from "apollo-server-lambda";
import { ApolloGateway } from "@apollo/gateway";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

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
        uplinkEndpoints: [
          // These are the default endpoints:
          // 'https://uplink.api.apollographql.com/',
          // 'https://aws.uplink.api.apollographql.com/',

          // This is the fallback endpoint:
          `${process.env.SDL_BACKUP_ENDPOINT}${process.env.SDL_BACKUP_PATH}`,
        ],
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
// secrets management for the Apollo API key
// ****************************************************************************

const secretsClient = new SecretsManagerClient({});

/** @type {string | undefined} */
let memoizedSecretValue;

async function getApolloKey() {
  if (!memoizedSecretValue) {
    const command = new GetSecretValueCommand({
      SecretId: process.env.APOLLO_KEY_ARN,
    });

    const resp = await secretsClient.send(command);
    memoizedSecretValue = resp.SecretString;
  }

  return memoizedSecretValue;
}
