import { ApolloServer } from "apollo-server-lambda";
import { ApolloGateway } from "@apollo/gateway";
import fetcher from "make-fetch-happen";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

/** @type {typeof import("apollo-server-env").fetch}} */
const wrappedFetcher = async (req, init) => {
  // **************************************************************************
  // NOTE: uncomment this line and comment out the next line to enable the
  // default behavior using the Uplink API.
  // **************************************************************************

  // const resp = await fetcher(req, init);
  const resp = /** @type {import("apollo-server-env").Response} */ ({
    ok: false,
  });

  if (!resp.ok) {
    assert(process.env.APOLLO_GRAPH_REF, "APOLLO_GRAPH_REF is not set");
    assert(process.env.SDL_BACKUP_ENDPOINT, "SDL_BACKUP_ENDPOINT is not set");
    assert(process.env.SDL_BACKUP_PATH, "SDL_BACKUP_PATH is not set");

    const fallbackUrl = `${process.env.SDL_BACKUP_ENDPOINT}${process.env.SDL_BACKUP_PATH}`;

    console.log(
      `*** schema update request failed, using backup ${fallbackUrl} ***`
    );

    return fetcher(fallbackUrl, {
      headers: { "x-graph-ref": process.env.APOLLO_GRAPH_REF },
    });
  } else {
    return resp;
  }
};

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
        fetcher: wrappedFetcher,
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

/**
 * @param {any} condition
 * @param {string} message
 * @returns {asserts condition}
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
