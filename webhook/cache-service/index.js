import express from "express";
import bodyParser from "body-parser";
import { readFile, stat, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fetch from "make-fetch-happen";
import logger from "morgan";

const app = express();
app.use(logger("combined"));
app.use(bodyParser.json());

const cacheFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "tmp/supergraphSdl.graphql"
);

app.post("/build-status", async (req, res) => {
  const body = /** @type {ResponseShape} */ (req.body);

  if (body.supergraphSchemaURL) {
    const content = await (await fetch(body.supergraphSchemaURL)).text();
    await writeFile(cacheFile, content, "utf-8");
    console.log("cached new supergraph sdl");
  } else {
    console.log("invalid build, ignoring");
  }

  res.json({ ok: true });
});

app.get("/backup-sdl", async (_, res) => {
  const sdl = await readFile(cacheFile, "utf-8");
  const stats = await stat(cacheFile);
  res.json({
    data: {
      routerConfig: {
        __typename: "RouterConfigResult",
        id: stats.mtime,
        supergraphSdl: sdl,
      },
    },
  });
});

app.listen(process.env.PORT ?? "5000", () =>
  console.log(`webhook listening on ${process.env.PORT ?? "5000"}`)
);
