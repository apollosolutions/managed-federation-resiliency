import { CfnOutput, Duration, Stack } from "aws-cdk-lib";
import {
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_secretsmanager as secrets,
} from "aws-cdk-lib";
import * as gateway from "@aws-cdk/aws-apigatewayv2-alpha";
import * as integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { join } from "path";

export class InfraStack extends Stack {
  /**
   * @param {import("constructs").Construct} scope
   * @param {string} id
   * @param {import("aws-cdk-lib").StackProps} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // ************************************************************************
    // Secrets
    // ************************************************************************

    const apolloKey = secrets.Secret.fromSecretCompleteArn(
      this,
      "apollo-key",
      this.node.tryGetContext("apolloKeyArn")
    );

    const webhookKey = secrets.Secret.fromSecretCompleteArn(
      this,
      "webhook-key",
      this.node.tryGetContext("webhookKeyArn")
    );

    // ************************************************************************
    // S3
    // ************************************************************************

    const bucket = new s3.Bucket(this, "webhook-bucket", {});

    // ************************************************************************
    // Webhook and fallback lambda
    // ************************************************************************

    const webhookHandler = new lambda.Function(this, "webhook-lambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        join(process.cwd(), "../webhook-handler/out")
      ),
      handler: "index.webhookHandler",
      environment: {
        WEBHOOK_KEY_ARN: webhookKey.secretArn,
        BUCKET_NAME: bucket.bucketName,
        BUCKET_REGION: "us-east-1",
      },
    });

    // ************************************************************************
    // API Gateway for the webhook
    // ************************************************************************

    const webhookRoute = new integrations.HttpLambdaIntegration(
      "webhook-lambda-integration",
      webhookHandler,
      {
        payloadFormatVersion: gateway.PayloadFormatVersion.VERSION_2_0,
      }
    );

    const api = new gateway.HttpApi(this, "webhook-api", {
      defaultIntegration: webhookRoute,
    });

    // ************************************************************************
    // Gateway lambda + API gateway
    // ************************************************************************

    const gatewayHandler = new lambda.Function(this, "gateway-lambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(join(process.cwd(), "../gateway/out")),
      handler: "index.handler",
      // Loading the supergraph from uplink, failing, and loading from s3 takes
      // a pretty long time.
      timeout: Duration.seconds(10),
      environment: {
        APOLLO_KEY_ARN: apolloKey.secretArn,
        APOLLO_GRAPH_REF: /** @type {string} */ (process.env.APOLLO_GRAPH_REF),
        FALLBACK_BUCKET_NAME: bucket.bucketName,
        FALLBACK_BUCKET_REGION: "us-east-1",
      },
    });

    const gatewayRoute = new integrations.HttpLambdaIntegration(
      "gateway-lambda-integration",
      gatewayHandler,
      {
        payloadFormatVersion: gateway.PayloadFormatVersion.VERSION_2_0,
      }
    );

    const gatewayApi = new gateway.HttpApi(this, "gateway-api", {
      defaultIntegration: gatewayRoute,
    });

    // ************************************************************************
    // Grants
    // ************************************************************************

    webhookKey.grantRead(webhookHandler);
    bucket.grantReadWrite(webhookHandler);
    bucket.grantRead(gatewayHandler);
    apolloKey.grantRead(gatewayHandler);

    // ************************************************************************
    // Outputs
    // ************************************************************************

    new CfnOutput(this, "webhook-url", { value: api.apiEndpoint });
    new CfnOutput(this, "gateway-url", { value: gatewayApi.apiEndpoint });
  }
}
