import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const serverRoot = join(process.cwd(), ".next", "server");
const manifestPath = join(serverRoot, "server-reference-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const canonicalPath = (value) => value.replaceAll("\\", "/").replace(/\/{2,}/g, "/");
const expected = new Map([
  [
    canonicalPath("src/actions/circle-card-onboarding.actions.ts"),
    ["publishFirstCircleCardAction", "saveFirstCircleCardStepAction"]
  ],
  [canonicalPath("src/actions/circle-card-report.actions.ts"), ["submitCircleCardReportAction"]]
]);

function filesBelow(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

const serverJavaScript = filesBelow(serverRoot).filter(
  (path) => path.endsWith(".js") && !path.endsWith("server-reference-manifest.js")
);
const compiledSources = serverJavaScript.map((path) => ({ path, source: readFileSync(path, "utf8") }));

for (const [sourceSuffix, approvedExports] of expected) {
  const references = Object.entries(manifest.node).filter(([, reference]) =>
    canonicalPath(reference.filename).endsWith(sourceSuffix)
  );
  const exportedNames = references.map(([, reference]) => reference.exportedName).sort();

  if (JSON.stringify(exportedNames) !== JSON.stringify([...approvedExports].sort())) {
    throw new Error(
      `Unexpected production server-action exports for ${sourceSuffix}: ${exportedNames.join(", ") || "none"}`
    );
  }

  for (const [actionId, reference] of references) {
    if (!Object.values(reference.workers).every((worker) => worker.async === true)) {
      throw new Error(`Server action ${reference.exportedName} is not marked async in the production manifest.`);
    }

    let compiledAsyncFunctionFound = false;
    for (const compiled of compiledSources) {
      const registration = new RegExp(`\\)\\(([A-Za-z_$][\\w$]*),["']${actionId}["']`).exec(compiled.source);
      if (!registration) continue;

      const symbol = registration[1];
      const declarationWindow = compiled.source.slice(Math.max(0, registration.index - 12_000), registration.index);
      compiledAsyncFunctionFound = new RegExp(`async function ${symbol}\\s*\\(`).test(declarationWindow);
      if (compiledAsyncFunctionFound) break;
    }

    if (!compiledAsyncFunctionFound) {
      throw new Error(
        `Compiled server action ${reference.exportedName} is not registered from an async function.`
      );
    }
  }
}

console.info("Circle Card production server-action exports verified.");
