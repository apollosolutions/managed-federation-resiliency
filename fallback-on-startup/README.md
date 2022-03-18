# Uplink fallback on Gateway startup

The most significant effect of an Uplink outage is that it prevents new Gateway
instances from starting up. Currently running Gateways can usually continue to
serve a stale supergraph without issue, and now that Uplink is multi-cloud and
multi-region outages will typically be rare and short-lived. But even a
temporary an Uplink outage can negatively affect your API's uptime during these
scenarios:

- A Gateway node has to restart.
- You need to deploy an urgent code change.
- You're scaling up your Gateway deployment horizontally.

The other examples in this repository provide Uplink caches or fallbacks
that take effect every time the Gateway polls for a new supergraph. This
example takes effect only on Gateway startup.

Caching supergraphs and making them available to the new `initialSupergraphSdl`
function is left as an exercise for the reader.

## Demo

1. Add environment variables for your Apollo API key and graphref to a new
   `.env` file in this directory:
   ```sh
   APOLLO_KEY="your api key"
   APOLLO_GRAPH_REF=mygraph@current
   ```
2. Run the Gateway and a proxy for the Uplink API with Docker Compose:
   ```sh
   docker compose up --build
   ```
3. Observe that the Gateway starts even though the requests to Uplink result in
   HTTP 500 responses.
4. Edit `apibreaker.conf` to "unbreak" the proxy:
   ```diff
    location / {
   -   return 500 "<b>Down!</b>";
   +   proxy_pass https://uplink.api.apollographql.com;
    }
   ```
5. Restart nginx:
   ```sh
   docker exec -d fallback-on-startup-apibreaker-1 /etc/init.d/nginx reload
   ```
6. Observe that the Gateway successfully loads a supergraph from Uplink:
   ```
   Updated Supergraph SDL was found.
   ```
