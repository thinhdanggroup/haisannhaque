import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseAgyResponse } from "../response-parser";
import type { ContentGenerator, GenerateInput, GenerateResult } from "./types";

const execFileAsync = promisify(execFile);

const DEFAULT_PRINT_TIMEOUT_SECONDS = 120;
// Give the subprocess a little longer than agy's own --print-timeout so a
// hung process is killed rather than holding the request open forever.
const KILL_BUFFER_SECONDS = 15;
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

export type AgyGeneratorConfig = {
  binPath: string;
  imageDir: string;
  printTimeoutSeconds?: number;
};

export function buildAgyArgs(input: GenerateInput, config: AgyGeneratorConfig): string[] {
  const timeout = config.printTimeoutSeconds ?? DEFAULT_PRINT_TIMEOUT_SECONDS;

  const args = [
    "-p",
    input.prompt,
    "--output-format",
    "json",
    "--print-timeout",
    `${timeout}s`,
    // Required, not optional: without it agy shells out to orient itself and
    // hits the denied `command` permission (spec §2.4.1).
    "--add-dir",
    config.imageDir,
  ];

  if (input.conversationId) {
    args.push("--conversation", input.conversationId);
  }

  return args;
}

export function createAgyGenerator(config: AgyGeneratorConfig): ContentGenerator {
  return {
    async generate(input: GenerateInput): Promise<GenerateResult> {
      const args = buildAgyArgs(input, config);
      const timeout = config.printTimeoutSeconds ?? DEFAULT_PRINT_TIMEOUT_SECONDS;

      try {
        // execFile, never exec: args are passed as an array so admin-supplied
        // prompt text is never interpreted by a shell.
        const { stdout, stderr } = await execFileAsync(config.binPath, args, {
          cwd: config.imageDir,
          // agy reads its credentials from $HOME/.gemini/antigravity-cli.
          env: process.env,
          timeout: (timeout + KILL_BUFFER_SECONDS) * 1000,
          maxBuffer: MAX_BUFFER_BYTES,
        });
        return parseAgyResponse({ exitCode: 0, stdout, stderr });
      } catch (error) {
        const failure = error as {
          code?: number | string;
          stdout?: string;
          stderr?: string;
          message?: string;
        };
        return parseAgyResponse({
          exitCode: typeof failure.code === "number" ? failure.code : 1,
          stdout: failure.stdout ?? "",
          stderr: failure.stderr ?? failure.message ?? "",
        });
      }
    },
  };
}
