import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { createHmac } from "crypto";
import fetch from "make-fetch-happen";
import { streamToString } from "./stream.js";

const client = new S3Client({
  region: process.env.BUCKET_REGION,
});

/**
 * Function handler for accepting the webhook payload. It will validate the
 * request, fetch the supergraph schema from the temporary URL, and store it
 * in the S3 bucket.
 * @type {import("aws-lambda").Handler<import("aws-lambda").APIGatewayProxyEvent, import("aws-lambda").APIGatewayProxyResult>}
 */
export async function webhookHandler(event) {
  if (!event.body) {
    return {
      statusCode: 400,
      body: "Missing body",
    };
  }

  // Ensure that the request comes from Studio by verifying the signature using
  // the webhook secret key. Deny the request if the signature is invalid or missing.
  if (event.headers["x-apollo-signature"]) {
    const secret = await getWebhookSecret();
    assert(secret, "secret not found");

    const [algo, signature] = event.headers["x-apollo-signature"].split("=");

    const hash = createHmac(algo, secret).update(event.body).digest("hex");

    if (signature !== hash) {
      return {
        statusCode: 400,
        body: "Invalid signature",
      };
    }
  } else {
    return {
      statusCode: 400,
      body: "Missing signature",
    };
  }

  /** @type {ResponseShape} */
  const body = JSON.parse(event.body);

  if (body.supergraphSchemaURL) {
    const resp = await fetch(body.supergraphSchemaURL);
    const schema = await resp.text();

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${body.variantID}.graphql`,
        Body: schema,
        Metadata: {
          "content-type": "application/graphql",
          "last-modified": body.timestamp,
        },
      })
    );
  }

  return { statusCode: 200, body: '{ "ok": true }' };
}

/**
 * Function handler for a Uplink fallback API. It retrieves the supergraph from
 * the S3 bucket and mimics the Uplink API response to act as a drop-in replacement.
 * @type {import("aws-lambda").Handler<import("aws-lambda").APIGatewayProxyEvent, import("aws-lambda").APIGatewayProxyResult>}
 */
export async function fallbackHandler(event) {
  const objectKey = `${event.headers["x-graph-ref"]}.graphql`;

  try {
    const obj = await client.send(
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: objectKey,
      })
    );

    if (!obj || !obj.Body) {
      return { statusCode: 404, body: "Not found" };
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        data: {
          routerConfig: {
            __typename: "RouterConfigResult",
            id: obj.Metadata?.["last-modified"] ?? "0",
            supergraphSdl: await streamToString(obj.Body),
          },
        },
      }),
    };
  } catch (/** @type {any} */ error) {
    if (error.message === "NoSuchKey") {
      return { statusCode: 404, body: `${objectKey} not found` };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: error.message }),
      };
    }
  }
}

const secretsClient = new SecretsManagerClient({});

/** @type {string | undefined} */
let memoizedSecretValue;

async function getWebhookSecret() {
  if (!memoizedSecretValue) {
    const command = new GetSecretValueCommand({
      SecretId: process.env.WEBHOOK_KEY_ARN,
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
