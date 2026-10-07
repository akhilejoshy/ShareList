import type { CardElement } from "@/lib/meta/graphClient";

interface CandidateForCard {
  candidateId: string;
  title: string;
  year: string | null;
  coverImageUrl: string | null;
}

export function buildCandidateCarousel(candidates: CandidateForCard[]): CardElement[] {
  return candidates.slice(0, 5).map((c) => ({
    title: c.year ? `${c.title} (${c.year})` : c.title,
    imageUrl: c.coverImageUrl ?? undefined,
    postbackPayload: `PICK_CANDIDATE:${c.candidateId}`,
    buttonTitle: "This one ✅",
  }));
}

export function skipQuickReply(reelId: string) {
  return { title: "Skip", payload: `SKIP_PROMPT:${reelId}` };
}
