import type { GenerateResult } from "./generator/types";
import { POST_END, POST_START } from "./prompt-builder";

type AgyEnvelope = {
  conversation_id?: string;
  status?: string;
  response?: string;
  duration_seconds?: number;
  usage?: { total_tokens?: number };
  denied_actions?: Array<{ action?: string; display_name?: string }>;
};

export type ParseAgyInput = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const MARKDOWN_FILE_LINK = /\[([^\]]+)\]\(file:\/\/[^)]*\)/g;
const STDERR_EXCERPT_LIMIT = 300;

export function stripMarkdownFileLinks(text: string): string {
  return text.replace(MARKDOWN_FILE_LINK, "$1");
}

export function extractPost(response: string): string {
  const start = response.indexOf(POST_START);
  const end = response.indexOf(POST_END, start === -1 ? 0 : start + POST_START.length);

  const body =
    start !== -1 && end !== -1 && end > start
      ? response.slice(start + POST_START.length, end)
      : start !== -1
        ? response.slice(start + POST_START.length)
        : response;

  return stripMarkdownFileLinks(body).trim();
}

function excerpt(text: string): string {
  return text.trim().slice(0, STDERR_EXCERPT_LIMIT);
}

export function parseAgyResponse(input: ParseAgyInput): GenerateResult {
  const { exitCode, stdout, stderr } = input;

  if (exitCode !== 0) {
    return { ok: false, error: `agy thất bại (exit ${exitCode}): ${excerpt(stderr)}` };
  }

  let envelope: AgyEnvelope;
  try {
    envelope = JSON.parse(stdout) as AgyEnvelope;
  } catch {
    return {
      ok: false,
      error: `Không đọc được kết quả từ agy: ${excerpt(stdout || stderr)}`,
    };
  }

  // Checked before status: agy reports denials with status SUCCESS and an
  // empty response, so status alone is not a sufficient health check.
  const denied = (envelope.denied_actions ?? [])
    .map((entry) => entry.action)
    .filter((action): action is string => Boolean(action));

  if (denied.length > 0) {
    return {
      ok: false,
      error:
        `agy bị từ chối quyền: ${denied.join(", ")}. ` +
        "Kiểm tra permissions.allow trong cấu hình agy.",
      deniedActions: denied,
    };
  }

  if (envelope.status !== "SUCCESS") {
    return { ok: false, error: `agy trả về trạng thái ${envelope.status ?? "không rõ"}.` };
  }

  const caption = extractPost(envelope.response ?? "");
  if (caption.length === 0) {
    return { ok: false, error: "agy không trả về nội dung bài đăng." };
  }

  return {
    ok: true,
    caption,
    conversationId: envelope.conversation_id ?? "",
    durationMs: Math.round((envelope.duration_seconds ?? 0) * 1000),
    tokens: envelope.usage?.total_tokens ?? 0,
  };
}
