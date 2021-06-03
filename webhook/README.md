# Webhook-triggered SDL backup

## Try it out

1. Make a copy of gateway/.env.sample as gateway/.env and add your studio api key.
2. Start the cluster: `docker compose up --build`.
3. Watch the logs to see the gateway load: `Schema loaded and ready for execution`.
4. Make the cache-service webhook endpoint available to studio:
   1. Install ngrok: `brew install ngrok`
   2. Run the ngrok proxy: `ngrok http 5000`
   3. Copy the http forwarding url (something like: http://a1b2c3d4e5f6.ngrok.io)
5. [Register your webhook in Apollo Studio][register].
6. Trigger a schema change with [`rover subgraph publish`][publish]. Observe that
   a file is written inside cache-service/tmp/.
7. Bring down the api:
   1. Uncomment `return 500 "<b>Down!</b>";` in apibreaker.conf.
   2. Restart nginx: `docker exec -d webhook_apibreaker_1 /etc/init.d/nginx reload`.
8. Observe that requests to `apibreaker_1` have a status code of 500.
9. Restart the gateway with `touch gateway/index.js`. Observe that it restarts without issue.
10. Make another schema change. Observe that the gateway updates after the webhook
    is triggered.

[register]: https://studio.apollographql.com/graph/lenny-starter-test/settings/notifications?overlay=add-notification-wizard&variant=current
[publish]: https://www.apollographql.com/docs/rover/subgraphs/#publishing-a-subgraph-schema-to-apollo-studio

## Considerations this for your gateway

- The webhook endpoint and the supergraph SDL storage do not have to live in the
  same service. You could store the supergraph SDL in a cloud storage solution,
  as long as it's accessible to the gateway.
- @apollo/gateway uses an `id` value to determine whether the schema changed, not
  the content of the supergraph SDL. In this demo I'm using the file modified time.
