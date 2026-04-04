#!/usr/bin/env node

/**
 * Video generation script for Goose Bets
 * Generates setup and reveal videos for all rounds using ElevenLabs API.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=xxx node scripts/generate-videos.js
 *   ELEVENLABS_API_KEY=xxx node scripts/generate-videos.js --dry-run
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENT_LIMIT = 4;
const OUTPUT_DIR = path.join(__dirname, "..", "public", "videos");
const ROUNDS_PATH = path.join(__dirname, "..", "data", "rounds.json");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey && !DRY_RUN) {
    console.error("Error: ELEVENLABS_API_KEY environment variable is required.");
    console.error("Usage: ELEVENLABS_API_KEY=xxx node scripts/generate-videos.js");
    process.exit(1);
  }

  const roundsData = JSON.parse(fs.readFileSync(ROUNDS_PATH, "utf-8"));
  const rounds = roundsData.rounds;

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Build list of all generation tasks
  const tasks = [];
  for (const round of rounds) {
    const setupPath = path.join(OUTPUT_DIR, `${round.id}_setup.mp4`);
    const revealPath = path.join(OUTPUT_DIR, `${round.id}_reveal.mp4`);

    if (!fs.existsSync(setupPath)) {
      tasks.push({
        round,
        type: "setup",
        prompt: round.setupPrompt,
        outputPath: setupPath,
      });
    } else {
      console.log(`Skipping ${round.id} setup (already exists)`);
    }

    if (!fs.existsSync(revealPath)) {
      tasks.push({
        round,
        type: "reveal",
        prompt: round.revealPrompt,
        outputPath: revealPath,
      });
    } else {
      console.log(`Skipping ${round.id} reveal (already exists)`);
    }
  }

  console.log(`\n${tasks.length} videos to generate (${rounds.length * 2 - tasks.length} skipped)\n`);

  if (DRY_RUN) {
    console.log("=== DRY RUN — Prompts that would be sent ===\n");
    tasks.forEach((task, i) => {
      console.log(`[${i + 1}/${tasks.length}] ${task.type} for "${task.round.title}"`);
      console.log(`  Prompt: ${task.prompt}`);
      console.log(`  Output: ${task.outputPath}\n`);
    });
    console.log("Dry run complete. No API calls made.");
    return;
  }

  const client = new ElevenLabsClient({ apiKey });

  // Process in batches of CONCURRENT_LIMIT
  for (let i = 0; i < tasks.length; i += CONCURRENT_LIMIT) {
    const batch = tasks.slice(i, i + CONCURRENT_LIMIT);
    const promises = batch.map(async (task, batchIdx) => {
      const taskNum = i + batchIdx + 1;
      console.log(`[${taskNum}/${tasks.length}] Generating ${task.type} for "${task.round.title}"...`);

      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          const result = await client.textToVideo.generate({
            prompt: task.prompt,
            model: "wan-2.5",
            duration: "5",
            aspect_ratio: "16:9",
            resolution: "720p",
          });

          // The SDK returns a readable stream or buffer
          if (result && typeof result.pipe === "function") {
            const writer = fs.createWriteStream(task.outputPath);
            result.pipe(writer);
            await new Promise((resolve, reject) => {
              writer.on("finish", resolve);
              writer.on("error", reject);
            });
          } else if (Buffer.isBuffer(result)) {
            fs.writeFileSync(task.outputPath, result);
          } else if (result?.url) {
            const response = await fetch(result.url);
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(task.outputPath, buffer);
          }

          console.log(`[${taskNum}/${tasks.length}] ✓ Saved ${task.type} for "${task.round.title}"`);
          return;
        } catch (error) {
          retries++;
          if (retries > maxRetries) {
            console.error(`[${taskNum}/${tasks.length}] ✗ Failed ${task.type} for "${task.round.title}": ${error.message}`);
            return;
          }
          const backoff = Math.pow(2, retries) * 1000;
          console.log(`[${taskNum}/${tasks.length}] Rate limited, retrying in ${backoff / 1000}s...`);
          await sleep(backoff);
        }
      }
    });

    await Promise.all(promises);
  }

  console.log("\nDone! All videos generated.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
