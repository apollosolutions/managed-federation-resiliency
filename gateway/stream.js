import { Readable } from "stream";

/**
 * Utility for converting the S3 object body into a string.
 * @param {Readable | ReadableStream<any> | Blob} stream
 * @returns {Promise<string>}
 */
export function streamToString(stream) {
  if (stream instanceof Readable) {
    /** @type {Buffer[]} */
    const chunks = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", (err) => reject(err));
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  } else if (stream instanceof ReadableStream) {
    return readStream(stream);
  } else {
    return stream.text();
  }
}

/**
 * @template T
 * @param {ReadableStream<T>} stream
 */
function readStream(stream) {
  const reader = stream.getReader();
  /** @type {T[]} */
  const result = [];

  /**
   * @param {{ done: boolean, value?: T }} param
   * @returns {Promise<string>}
   */
  function processText({ done, value }) {
    if (done) {
      return Promise.resolve(result.join(""));
    }

    if (value) {
      result.push(value);
    }

    // Read some more, and call this function again
    return reader.read().then(processText);
  }

  return reader.read().then(processText);
}
