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
      "We intercepted a strange audio transmission. Hidden within the static is an image. Decode it — SSTV mode: Robot 36. What does the image say?",
    hintText: "Try QSSTV or Black Cat Systems to decode the .wav file.",
    contentUrl: "/assets/stage1_signal.wav",
    answerHash: hashAnswer("REPLACE_WITH_TEXT_IN_SSTV_IMAGE"),
    points: 150,
  },
  {
    stageNumber: 2,
    title: "The Drive",
    type: "OSINT",
    description:
      "The image led you somewhere. Follow the link and find what's waiting at the other end of the drive.",
    hintText: "Look inside the image carefully — sometimes things hide in plain sight.",
    contentUrl: null,
    answerHash: hashAnswer("REPLACE_WITH_DRIVE_DOCUMENT_CODE"),
    points: 150,
  },
  {
    stageNumber: 3,
    title: "Monkey Business",
    type: "STEGANOGRAPHY",
    description:
      "A peculiar meme. Monkeys always know more than they let on. Dig into the metadata — the coordinates are somewhere in there.",
    hintText: "exiftool is your friend. GPS coordinates — what do they reveal on Google Maps?",
    contentUrl: "/assets/stage3_meme.jpg",
    answerHash: hashAnswer("12.9716,77.5946"),
    points: 200,
  },
  {
    stageNumber: 4,
    title: "You Are Here",
    type: "OSINT",
    description:
      "Those coordinates point to a real location. Find the establishment at that spot. What is its name?",
    hintText: "Drop the pin on Google Maps. Look for nearby businesses.",
    contentUrl: null,
    answerHash: hashAnswer("REPLACE_WITH_SHOP_NAME"),
    points: 200,
  },
  {
    stageNumber: 5,
    title: "The Hidden Door",
    type: "WEB",
    description:
      "Every shop has a back door. Combine the shop name with .vercel.app — then find the secret path. There's a QR code waiting for you.",
    hintText: "Try appending /secret or /hidden to the URL. Not every path is indexed.",
    contentUrl: null,
    answerHash: hashAnswer("REPLACE_WITH_QR_ENCODED_TEXT"),
    points: 250,
  },
  {
    stageNumber: 6,
    title: "Packet Sniffer",
    type: "NETWORK",
    description:
      "The QR revealed an IP address. Run Nmap against it. What service is listening? Submit the flag you find.",
    hintText: "nmap -sV -p- <IP>. Check all ports. Banner grabbing might help.",
    contentUrl: null,
    answerHash: hashAnswer("REPLACE_WITH_VPS_SERVICE_FLAG"),
    points: 300,
  },
  {
    stageNumber: 7,
    title: "Down the Rabbit Hole",
    type: "OSINT",
    description:
      "The hidden service pointed you to another drive. Watch the video carefully. There is a code hidden within it.",
    hintText: "Watch every frame. Pause at the right moment.",
    contentUrl: null,
    answerHash: hashAnswer("REPLACE_WITH_VIDEO_CODE"),
    points: 300,
  },
  {
    stageNumber: 8,
    title: "Unmask",
    type: "REVERSE_ENGINEERING",
    description:
      "Final stage. A pixelated mosaic hides the truth. Use the de-pixelation notebook linked below to reveal what lies beneath. Your flag is unique — it belongs only to you.",
    hintText:
      "Run the Jupyter notebook. Use your CyberCarnival username as the seed parameter. Your flag will be displayed on this page once you complete the notebook.",
    contentUrl:
      "https://github.com/KoKuToru/de-pixelate_gaV-O6NPWrl/blob/master/example/mosaic-area.ipynb",
    answerHash: null,
    finalBaseCode: "CYBERCARNIVAL_STAGE8_SECRET_SEED_2026",
    points: 500,
  },
];

async function main() {
  console.log("🌱  Seeding CyberCarnival database...");

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
