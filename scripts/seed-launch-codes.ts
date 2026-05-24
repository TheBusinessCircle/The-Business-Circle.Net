import { seedDefaultLaunchCodes } from "@/server/admin/launch-codes.service";

async function main() {
  const codes = await seedDefaultLaunchCodes();
  console.info(`Seeded ${codes.length} launch codes.`);
}

main()
  .catch((error) => {
    console.error("Unable to seed launch codes.", error);
    process.exitCode = 1;
  });
