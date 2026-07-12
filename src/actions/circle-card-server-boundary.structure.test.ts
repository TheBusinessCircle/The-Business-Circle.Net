import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const actionEntrypoints = [
  {
    path: "src/actions/circle-card-onboarding.actions.ts",
    exports: ["publishFirstCircleCardAction", "saveFirstCircleCardStepAction"]
  },
  {
    path: "src/actions/circle-card-report.actions.ts",
    exports: ["submitCircleCardReportAction"]
  }
] as const;

function exportedRuntimeDeclarations(path: string) {
  const source = readFileSync(join(process.cwd(), path), "utf8");
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const directive = file.statements[0];
  expect(ts.isExpressionStatement(directive) && directive.expression.getText(file) === '"use server"').toBe(true);

  return file.statements.flatMap((statement) => {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return [];

    if (!ts.isFunctionDeclaration(statement) || !statement.name) {
      return [{ name: statement.getText(file), async: false }];
    }

    return [{
      name: statement.name.text,
      async: Boolean(modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword))
    }];
  });
}

describe("Circle Card use-server entrypoint boundaries", () => {
  it.each(actionEntrypoints)("allows only approved async functions from $path", ({ path, exports }) => {
    const runtimeExports = exportedRuntimeDeclarations(path);

    expect(runtimeExports.map((entry) => entry.name).sort()).toEqual([...exports].sort());
    expect(runtimeExports.every((entry) => entry.async)).toBe(true);
  });
});
