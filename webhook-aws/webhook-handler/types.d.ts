interface BuildError {
  message: string;
  locations: ReadonlyArray<Location>;
}

interface Location {
  line: number;
  column: number;
}

interface ResponseShape {
  eventType: "BUILD_PUBLISH_EVENT";
  eventID: string;
  supergraphSchemaURL: string | undefined;
  buildErrors: BuildError[] | undefined;
  graphID: string;
  variantID: string;
  timestamp: string; // ISO 8601 Date string
}
