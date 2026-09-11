export type GenerateInput = {
  prompt: string;
  // Absolute path, only set in vision mode. agy cannot read a URL.
  imagePath?: string;
  // Set to continue an existing agy conversation (used by regeneration).
  conversationId?: string;
};

export type GenerateResult =
  | {
      ok: true;
      caption: string;
      conversationId: string;
      durationMs: number;
      tokens: number;
    }
  | {
      ok: false;
      error: string;
      deniedActions?: string[];
    };

export interface ContentGenerator {
  generate(input: GenerateInput): Promise<GenerateResult>;
}
