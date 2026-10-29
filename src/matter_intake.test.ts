import assert from "node:assert/strict";
import { decideMatter } from "./matter_intake.ts";

const decision = decideMatter({ matterId: "M-104", clientEmail: "counsel@example.com", signedDocumentDelivered: false, deadlineFollowUpDays: 7 });
assert.deepEqual(decision, { matterId: "M-104", followUp: "schedule", reason: "signed document is still outstanding" });
console.log("matter decision test passed: an unsigned delivery schedules deadline follow-up");
