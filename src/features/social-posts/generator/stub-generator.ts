import type { ContentGenerator, GenerateInput, GenerateResult } from "./types";

export function createStubGenerator(
  result: GenerateResult,
): ContentGenerator & { calls: GenerateInput[] } {
  const calls: GenerateInput[] = [];

  return {
    calls,
    async generate(input: GenerateInput): Promise<GenerateResult> {
      calls.push(input);
      return result;
    },
  };
}
