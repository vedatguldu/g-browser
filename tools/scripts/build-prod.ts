// SPDX-License-Identifier: MPL-2.0

import * as Builder from "../src/builder.ts";
import * as Update from "../src/update.ts";

console.log("Starting production build of all frontend bundles...");
const buildid2 = Update.generateUuidV7();
await Builder.run("production", buildid2);
console.log("Production build finished successfully!");
