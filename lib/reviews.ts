import { Locale } from "@/typescript/interface/domain.interface";
import { get, post } from "./api";

/**
 * Customer reviews (`/api/v1/reviews`). A customer writes one per item; it is
 * shown once the office approves it, and only approved ones make the rating.
 */

/** What a review is about. A property is enquiry-only and has none. */
export type ReviewTarget = "LISTING" | "HOTEL" | "RESTAURANT";

export interface Review {
  id: string;
  /** "Patrick M." — never the whole surname. */
  authorName: string;
  rating: number;
  comment?: string;
  /** They had a paid or completed booking of it when they wrote it. */
  verified: boolean;
  createdAt: string;
}

/** The customer's own review, which they also see while it waits. */
export interface OwnReview extends Review {
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface ReviewPage {
  items: Review[];
  total: number;
  /** Absent until the first approved review. */
  rating?: number;
  count: number;
}

export const MAX_REVIEW_COMMENT = 1000;

const about = (targetType: ReviewTarget, target: string) =>
  `targetType=${targetType}&target=${encodeURIComponent(target)}`;

/** GET /reviews — the approved ones, newest first. */
export const getReviews = (targetType: ReviewTarget, target: string, limit = 20) =>
  get<ReviewPage>(`/reviews?${about(targetType, target)}&limit=${limit}`);

/** GET /me/reviews — the signed-in customer's own review of this item, if any. */
export const getMyReview = (targetType: ReviewTarget, target: string) =>
  get<{ review: OwnReview | null }>(`/me/reviews?${about(targetType, target)}`).then(
    (r) => r.review
  );

/** POST /reviews — writes it, or rewrites it; either way it waits for approval. */
export const postReview = (body: {
  targetType: ReviewTarget;
  target: string;
  rating: number;
  comment?: string;
  locale: Locale;
}) => post<{ review: OwnReview }>("/reviews", body).then((r) => r.review);
