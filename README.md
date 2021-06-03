# Managed Federation Resiliency

This repo contains explorations for adding resiliency to an Apollo Gateway server
using managed federation.

## Approach #1: Nginx Caching Proxy

[Details](./nginx/README.md)

Configure your gateway to request schema updates from an Nginx instance that
proxies to Apollo Studio. The instance can be configured to return stale data
if Apollo Studio is unreachable.

## Approach #2: Build Status Webhook

[Details](./webhook/README.md)

Register a [Build Status webhook][webhook] in Apollo Studio that stores the
supergraph SDL each time the graph changes. If the gateway can't connect to
studio, use the stored SDL instead.

[webhook]: https://www.apollographql.com/docs/studio/build-status-notification/
