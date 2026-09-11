export type SocialPostStatus = "draft" | "generated" | "posted" | "scheduled" | "failed";

// "vision" hands agy an absolute image path to read; "attach-only" generates
// from the idea text alone and attaches the image to Facebook untouched.
export type ImageVisionMode = "vision" | "attach-only";

export type SocialPostTemplate = {
  id: string;
  name: string;
  promptBody: string;
  isDefault: boolean;
  isActive: boolean;
  updatedAt: string;
};

export type SocialPost = {
  id: string;
  templateId: string | null;
  idea: string;
  imageUrl: string | null;
  imageStoragePath: string | null;
  imageLocalPath: string | null;
  generatedCaption: string | null;
  editedCaption: string | null;
  status: SocialPostStatus;
  fbPostId: string | null;
  scheduledPublishTime: string | null;
  conversationId: string | null;
  generationMs: number | null;
  generationTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
  postedAt: string | null;
};

// The caption actually published: the admin's edit wins when present.
export function effectiveCaption(post: SocialPost): string {
  return post.editedCaption ?? post.generatedCaption ?? "";
}
