# Managed Federation Resiliency

This repo contains explorations for adding resiliency to an Apollo Gateway server
using managed federation.

## Approach #1: Nginx Caching Proxy

[Details](./nginx/README.md)

Configure your gateway to request schema updates from an Nginx instance that
proxies to Apollo Studio. The instance can be configured to return stale data
if Apollo Studio is unreachable.
