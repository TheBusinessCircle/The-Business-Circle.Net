import { readState } from "./deployment-state.mjs";
const mode = process.argv[2];
const state = readState("/var/lib/thebusinesscircle/deployment-state", { operational: true });
const legacyEligible = new Set(["none", "prepared", "candidates-verified"]);
const systemdEligible = new Set(["rollback-boot-ready", "rollback-live", "rollback-switch-pending", "rollback-starting", "forward-bcn-switch-pending", "forward-bcn-starting", "forward-bcn-live", "forward-live", "traffic-switched", "finalized", "circle-traffic-removed"]);
if (mode === "pm2") process.exit(legacyEligible.has(state.stage) ? 0 : 1);
if (mode === "systemd-bcn") process.exit(systemdEligible.has(state.stage) ? 0 : 1);
throw new Error("Unknown boot-owner condition mode.");
