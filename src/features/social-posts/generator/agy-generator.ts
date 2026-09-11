import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
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

      // The image dir is only ever created by the upload route. A
      // vision-mode or attach-only generation can run before any image has
      // been uploaded (e.g. the very first request against a fresh
      // environment), which would otherwise spawn agy with a nonexistent
      // cwd and fail with an opaque ENOENT.
      try {
        await mkdir(config.imageDir, { recursive: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          error: `Không tạo được thư mục ảnh ${config.imageDir}: ${message}`,
        };
      }

      try {
        // execFile, never exec: args are passed as an array so admin-supplied
        // prompt text is never interpreted by a shell.
        const { stdout, stderr } = await execFileAsync(config.binPath, args, {
          cwd: config.imageDir,
          // Narrowed deliberately: agy is a third-party agent process that
          // only needs to resolve its own binary (PATH, when binPath is the
          // bare "agy") and read its credentials from
          // $HOME/.gemini/antigravity-cli. It has no reason to see the rest
          // of this server's environment (service-role keys, webhook
          // secrets, payment tokens) — do not widen this back to
          // process.env. NODE_ENV is included only because this repo's
          // ProcessEnv type requires it; it carries no secret.
          env: {
            HOME: process.env.HOME,
            PATH: process.env.PATH,
            NODE_ENV: process.env.NODE_ENV,
          },
          timeout: (timeout + KILL_BUFFER_SECONDS) * 1000,
          maxBuffer: MAX_BUFFER_BYTES,
        });
        return parseAgyResponse({ exitCode: 0, stdout, stderr });
      } catch (error) {
        const failure = error as {
          code?: number | string;
          signal?: string | null;
          stdout?: string;
          stderr?: string;
          message?: string;
        };

        // A timeout kill leaves code null and stderr empty, so without this
        // check it would fall through to the generic exit-code branch below
        // with no message to show.
        if (failure.signal) {
          return {
            ok: false,
            error: `Sinh nội dung quá thời gian chờ (${timeout}s)`,
          };
        }

        return parseAgyResponse({
          exitCode: typeof failure.code === "number" ? failure.code : 1,
          stdout: failure.stdout ?? "",
          // `||`, not `??`: Node sets stderr to "" (not null/undefined) on a
          // kill or spawn failure, so `??` never fell through to `message`
          // and every such failure surfaced as a blank error to the admin.
          stderr: failure.stderr || failure.message || "",
        });
      }
    },
  };
}
