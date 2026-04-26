import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Expectation = {
  text: string;
  files: string[];
};

const routeFiles = {
  "/admin/resources": "src/app/(admin)/admin/resources/page.tsx",
  "/admin/resources/new": "src/app/(admin)/admin/resources/new/page.tsx",
  "/admin/resources/[id]": "src/app/(admin)/admin/resources/[id]/page.tsx",
  "/dashboard/resources": "src/app/(member)/dashboard/resources/page.tsx"
};

const componentFiles = {
  editor: "src/components/admin/resources/resource-editor-form.tsx",
  coverImage: "src/components/resources/resource-cover-image.tsx",
  libraryCard: "src/components/resources/resource-library-card.tsx",
  resourceMedia: "src/lib/resources/resource-media.ts"
};

const allFiles = [
  ...Object.values(routeFiles),
  ...Object.values(componentFiles)
];

const expectations: Expectation[] = [
  {
    text: "Resource Workflow UI v2 active",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Resource Image Workflow v2 active",
    files: [routeFiles["/admin/resources/new"]]
  },
  {
    text: "Daily Resource Generation",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Generate Today's 3 Resources",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Generate Missing Resource Images",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Prepare Missing Prompts",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Dry Run Backfill",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Backfill results",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Backfill limit",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Today's batch status",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Approve All",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Approve & Schedule All",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "migration check status",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "OpenAI/provider configured",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Cloudinary configured",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "daily generation service available",
    files: [routeFiles["/admin/resources"]]
  },
  {
    text: "Resource Image",
    files: [componentFiles.editor]
  },
  {
    text: "Image Direction",
    files: [componentFiles.editor]
  },
  {
    text: "Image Prompt",
    files: [componentFiles.editor]
  },
  {
    text: "Generate Cover Image",
    files: [componentFiles.editor]
  },
  {
    text: "Regenerate Cover Image",
    files: [componentFiles.editor]
  },
  {
    text: "Approval status",
    files: [componentFiles.editor]
  },
  {
    text: "Image status",
    files: [componentFiles.editor]
  },
  {
    text: "Image Status",
    files: [componentFiles.editor]
  },
  {
    text: "Generated Image URL",
    files: [componentFiles.editor]
  },
  {
    text: "Provider warning",
    files: [componentFiles.editor]
  },
  {
    text: "ResourceCoverImage",
    files: [
      routeFiles["/dashboard/resources"],
      componentFiles.libraryCard,
      componentFiles.coverImage
    ]
  }
];

function readFile(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  return readFileSync(absolutePath, "utf8");
}

function lineNumberFor(content: string, index: number) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function findText(text: string, files: string[]) {
  for (const file of files) {
    const content = readFile(file);
    if (!content) {
      continue;
    }

    const index = content.indexOf(text);
    if (index >= 0) {
      return {
        file,
        line: lineNumberFor(content, index)
      };
    }
  }

  return null;
}

let failures = 0;

console.log("Resource UI wiring route files");
for (const [route, file] of Object.entries(routeFiles)) {
  if (existsSync(path.join(process.cwd(), file))) {
    console.log(`PASS ${route} -> ${file}`);
  } else {
    failures += 1;
    console.log(`FAIL ${route} -> ${file}`);
    console.log(`WARNING route file not found for ${route}`);
  }
}

console.log("\nExpected UI strings");
for (const expectation of expectations) {
  const found = findText(expectation.text, expectation.files);
  if (found) {
    console.log(`PASS "${expectation.text}" -> ${found.file}:${found.line}`);
  } else {
    failures += 1;
    console.log(`FAIL "${expectation.text}"`);
    console.log(
      `WARNING not found in expected files: ${expectation.files.join(", ")}`
    );
  }
}

console.log("\nMember image priority");
const resourceMedia = readFile(componentFiles.resourceMedia);
if (resourceMedia) {
  const priorityTokens = [
    "input.coverImage",
    "input.generatedImageUrl",
    "input.mediaType === ResourceMediaType.IMAGE",
    "buildResourcePlaceholderImage(input)"
  ];
  const positions = priorityTokens.map((token) => resourceMedia.indexOf(token));
  const priorityPass =
    positions.every((position) => position >= 0) &&
    positions.every((position, index) => index === 0 || positions[index - 1] < position);

  if (priorityPass) {
    console.log(
      `PASS coverImage -> generatedImageUrl -> linked media image -> fallback -> ${componentFiles.resourceMedia}`
    );
  } else {
    failures += 1;
    console.log("FAIL coverImage -> generatedImageUrl -> linked media image -> fallback");
    console.log("WARNING image priority order was not found in resource-media.ts");
  }
} else {
  failures += 1;
  console.log(`FAIL missing ${componentFiles.resourceMedia}`);
}

if (failures > 0) {
  process.exitCode = 1;
}
