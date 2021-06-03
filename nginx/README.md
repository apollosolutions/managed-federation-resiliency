# Caching forward proxy for managed federation in Apollo Studio

Use nginx to cache requests to studio for managed federation. By setting
`proxy_cache_use_stale`, cached responses are used when the studio API is
unavailable.

## Try it out

1. Make a copy of gateway/.env.sample as gateway/.env and add your studio api key.
2. Start the cluster: `docker compose up --build`.
3. Watch the logs to see the gateway load: `Schema loaded and ready for execution`.
4. Bring down the api:
   1. Uncomment `return 500 "<b>Down!</b>";` in apibreaker.conf.
   2. Restart nginx: `docker exec -d nginx_apibreaker_1 /etc/init.d/nginx reload`.
5. Observe that requests to `apibreaker_1` have a status code of 500.
6. Restart the gateway with `touch gateway/index.js`. Observe that it restarts without issue.

## Configuring this for your gateway

1. Add an nginx service to your cluster.
2. Configure nginx to proxy requests to `https://federation.api.apollographql.com`.
3. Configure the managed federation endpoints in your gateway to point to nginx:
   ```sh
   export APOLLO_STORAGE_SECRET_BASE_URL=http://nginx
   export APOLLO_PARTIAL_SCHEMA_BASE_URL=http://nginx
   ```
4. Consider setting your cache storage directory to a shared volume to persist
   across restarts. You may need to configure a `[proxy_cache_lock][lock]` to
   handle concurrent updates.

[lock]: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_lock`
