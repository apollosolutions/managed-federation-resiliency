# Managed Federation Resiliency

This repo contains explorations for adding resiliency to an Apollo Gateway server
using managed federation.

## Preferred approach: Webhook-triggered SDL backup and Alternative Uplink Endpoint

[Details](./webhook-aws/README.md)

By registering a [Build Status webhook][webhook] in Apollo Studio, you can save
a copy of the latest supergraph schema to cloud storage and provide an
alternative Uplink endpoint. As of version 0.45.0, @apollo/gateway supports
multiple uplink endpoints, including ones that run within your infrastructure.

This is the most complete example and is set up to be deployed to AWS.

## Alternative approach #1: Webhook-triggered SDL backup and custom fetcher

[Details](./webhook/README.md)

Similar to the preferred approach, but uses a custom fetcher to fetch the
fallback SDL if the Uplink request fails (which works in versions of
@apollo/gateway older than 0.45.0).

[webhook]: https://www.apollographql.com/docs/studio/build-status-notification/

## Alternative approach #2: Nginx Caching Proxy

[Details](./nginx/README.md)

Configure your gateway to request schema updates from an Nginx instance that
proxies to Apollo Studio. The instance can be configured to return stale data
if Apollo Studio is unreachable.
