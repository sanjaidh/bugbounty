/**
 * CyberCarnival Database Seed
 * Seeds the 8 challenge stages and a default admin account.
 *
 * Run with: pnpm db:seed
 */

import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

function hashAnswer(answer: string): string {
  return crypto
    .createHash("sha256")
    .update(answer.trim().toLowerCase())
    .digest("hex");
}

const CHALLENGES = [
  {
    stageNumber: 1,
    title: "Signal in the Noise",
    type: "SSTV",
    description:
      "We intercepted a strange audio transmission. Hidden within the static is an image. Decode it . What does the image say?",
    hintText: "Try QSSTV or Black Cat Systems to decode the .wav file.",
    contentUrl: "/assets/stage1_signal.wav",
    answerHash: hashAnswer("flag{sstv_signal_in_the_static_robot36}"),
    points: 150,
  },
  {
    stageNumber: 2,
    title: "The Drive",
    type: "OSINT",
    description:
      "Follow the link and find what's waiting at the other end of the drive.",
    hintText: "Look inside the image carefully — sometimes things hide in plain sight.",
    contentUrl: null,
    answerHash: hashAnswer("flag{osint_google_drive_hidden_document}"),
    points: 150,
  },
  {
    stageNumber: 3,
    title: "Backdoor in the Billing Panel",
    type: "STEGANOGRAPHY",
    description:
      "A small internal billing tool was spun up in a hurry and exposed to the network for \"just a few days\" during a migration. It's still up. The devs swore the admin panel was locked down — find out if they were right, and recover the flag from the admin dashboard.",
    hintText: "Inspect the web panel and check for hidden or weak authentication endpoints.",
    contentUrl: null,
    answerHash: hashAnswer("bugbounty{jwt_alg_none_strikes_again}"),
    points: 300,
  },
  {
    stageNumber: 4,
    title: "The Intern Who Deleted Everything",
    type: "OSINT",
    description:
      "An intern says they \"didn't touch anything\" before the incident, but the disk tells a different story. We've pulled a raw image from their workstation. Somewhere in the slack space or deleted file table is evidence of what they tried to erase — and the flag",
    hintText: "Use disk forensics tools like Autopsy, FTK Imager, or sleuthkit.",
    contentUrl: null,
    answerHash: hashAnswer("flag{slack_space_deleted_forensics_evidence}"),
    points: 250,
  },
  {
    stageNumber: 5,
    title: "The Lazy Signer",
    type: "WEB",
    description:
      "A legacy internal API signs requests using ECDSA so clients can prove their identity without sending passwords. We captured two signed requests from the same service account during a traffic dump. The dev team insists their signing implementation is \"textbook standard.\" See if that holds up — recover the private key and sign your own admin request to get the flag.",
    hintText: "Check for nonce reuse (k-reuse) in ECDSA signatures.",
    contentUrl: "/assets/ecdsa_capture.zip",
    answerHash: hashAnswer("flag{ecdsa_nonce_reuse_private_key_recovery}"),
    points: 300,
  },
  {
    stageNumber: 6,
    title: "The Note-Taking App That Remembers Too Much",
    type: "NETWORK",
    description:
      "Someone on the dev team wrote a quick CLI note-taking tool in C \"for internal use only.\" It's been running on a server with a flag sitting in an environment variable. The binary and a netcat connection are provided — find the bug, get a shell, read the flag.",
    hintText: "Check for buffer overflows or format string vulnerabilities in the C binary.",
    contentUrl: null,
    answerHash: hashAnswer("flag{notes_use_after_free_print_func_hijack}"),
    points: 350,
  },
  {
    stageNumber: 7,
    title: "The Over-Restricted Python Jail",
    type: "OSINT",
    description:
      "A junior dev built a \"safe\" Python calculator for internal use, convinced that blacklisting a few keywords makes eval() safe. It's running locally and reads the flag into memory at startup. Break out of the sandbox and read it.",
    hintText: "Inspect Python builtins, __subclasses__(), or unicode bypasses to escape the sandbox.",
    contentUrl: null,
    answerHash: hashAnswer("flag{python_eval_sandbox_escape_via_subclasses}"),
    points: 300,
  },
  {
    stageNumber: 8,
    title: "The Serial Checker Nobody Documented",
    type: "REVERSE_ENGINEERING",
    description:
      "We found an old internal licensing tool on a decommissioned build server. It validates a \"license key\" before unlocking a hidden admin panel, but nobody left notes on the algorithm. Reverse engineer the binary, find a valid key, and run it to reveal the flag.",
    hintText: "Decompile with Ghidra or IDA Pro to find the key validation routine.",
    contentUrl: null,
    answerHash: hashAnswer("flag{serial_checker_license_key_validated}"),
    finalBaseCode: "CYBERCARNIVAL_STAGE8_SECRET_SEED_2026",
    points: 258,
  },
];

async function main() {
  console.log("🌱  Seeding CyberCarnival database...");

  // Seed Admin Account
  const adminPasswordHash = "$2a$12$PW82hosw4rAYgjN.r70xtOuDd4QbuC19cj7Pk9Ds33vknoKBA8uAS";
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
    create: {
      username: "admin",
      email: "admin@cybercarnival.org",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });
  console.log("  ✓ Admin User: admin (password: admin123)");

  for (const challenge of CHALLENGES) {
    await prisma.challenge.upsert({
      where: { stageNumber: challenge.stageNumber },
      update: {
        title: challenge.title,
        type: challenge.type,
        description: challenge.description,
        hintText: challenge.hintText,
        contentUrl: challenge.contentUrl ?? undefined,
        answerHash: challenge.answerHash ?? undefined,
        finalBaseCode: challenge.finalBaseCode ?? undefined,
        points: challenge.points,
      },
      create: {
        stageNumber: challenge.stageNumber,
        title: challenge.title,
        type: challenge.type,
        description: challenge.description,
        hintText: challenge.hintText,
        contentUrl: challenge.contentUrl ?? undefined,
        answerHash: challenge.answerHash ?? undefined,
        finalBaseCode: challenge.finalBaseCode ?? undefined,
        points: challenge.points,
      },
    });
    console.log(`  ✓ Stage ${challenge.stageNumber}: ${challenge.title}`);
  }

  console.log("✅  Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
