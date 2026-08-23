import { createHash } from "node:crypto";

export const REIMBURSEMENT_MOVEMENT_WINDOW_DAYS = 30;

export type ProductMatchStatus =
  | "matched_sku"
  | "matched_asin"
  | "unmatched"
  | "ambiguous"
  | "conflict";

export type MovementMatchStatus =
  | "not_evaluated"
  | "not_comparable"
  | "none"
  | "candidate"
  | "ambiguous";

export type ReconciliationStatus =
  | "unrecorded_amazon_reimbursement"
  | "possible_duplicate_loss"
  | "possible_existing_claim"
  | "linked"
  | "dismissed";

export interface AmazonReimbursementRow {
  reimbursementId: string | null;
  caseId: string | null;
  amazonOrderId: string | null;
  originalReimbursementId: string | null;
  originalReimbursementType: string | null;
  sku: string | null;
  fnsku: string | null;
  asin: string | null;
  reason: string | null;
  approvalDate: string | null;
  amountPerUnit: number;
  amountTotal: number;
  currency: string;
  quantityReimbursedCash: number;
  quantityReimbursedInventory: number;
  quantityReimbursedTotal: number;
  rawRow: Record<string, string>;
}

export interface ReimbursementProductCandidate {
  id: string;
  sku: string | null;
  asin: string | null;
  marketplace: string | null;
}

export interface ProductMatch {
  productId: string | null;
  status: ProductMatchStatus;
}

export interface ReimbursementMovementCandidate {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  created_at: string;
  reference: string | null;
}

export interface MovementMatch {
  status: MovementMatchStatus;
  candidates: ReimbursementMovementCandidate[];
}

export function buildAmazonReimbursementSourceKey(
  connectionId: string,
  marketplace: string,
  row: AmazonReimbursementRow,
): string {
  const externalId = normalize(row.reimbursementId);
  if (externalId) return `amazon-reimbursement:${connectionId}:${marketplace}:${externalId}`;

  const fallback = JSON.stringify([
    row.caseId,
    row.amazonOrderId,
    row.originalReimbursementId,
    row.originalReimbursementType,
    row.sku,
    row.fnsku,
    row.asin,
    row.reason,
    row.approvalDate,
    row.amountPerUnit,
    row.amountTotal,
    row.currency,
    row.quantityReimbursedCash,
    row.quantityReimbursedInventory,
    row.quantityReimbursedTotal,
    Object.entries(row.rawRow)
      .map(([key, value]) => [key.trim().toLowerCase().replace(/[\s-]+/g, "_"), value.trim().replace(/\s+/g, " ")])
      .sort(([left], [right]) => left.localeCompare(right)),
  ]);

  return `amazon-reimbursement:${connectionId}:${marketplace}:hash:${createHash("sha256")
    .update(fallback, "utf8")
    .digest("hex")}`;
}

export function resolveReimbursementProduct(
  row: Pick<AmazonReimbursementRow, "sku" | "asin">,
  candidates: ReimbursementProductCandidate[],
  marketplace: string,
): ProductMatch {
  const marketplaceCandidates = candidates.filter((candidate) => candidate.marketplace === marketplace);
  const fallbackCandidates = candidates.filter((candidate) => candidate.marketplace === null);
  const scopedCandidates = marketplaceCandidates.length > 0 ? marketplaceCandidates : fallbackCandidates;

  const skuCandidates = row.sku
    ? scopedCandidates.filter((candidate) => candidate.sku === row.sku)
    : [];
  const asinCandidates = row.asin
    ? scopedCandidates.filter((candidate) => candidate.asin === row.asin)
    : [];

  if (skuCandidates.length > 1 || asinCandidates.length > 1) {
    return { productId: null, status: "ambiguous" };
  }

  const skuMatch = skuCandidates[0];
  const asinMatch = asinCandidates[0];

  if (skuMatch && row.asin && asinMatch && skuMatch.id !== asinMatch.id) {
    return { productId: null, status: "conflict" };
  }

  if (skuMatch) return { productId: skuMatch.id, status: "matched_sku" };
  if (asinMatch) return { productId: asinMatch.id, status: "matched_asin" };
  return { productId: null, status: "unmatched" };
}

export function selectReimbursementMovementMatches(
  row: Pick<AmazonReimbursementRow, "approvalDate" | "reason" | "quantityReimbursedTotal">,
  movements: ReimbursementMovementCandidate[],
  windowDays = REIMBURSEMENT_MOVEMENT_WINDOW_DAYS,
): MovementMatch {
  const reason = normalize(row.reason).toLowerCase();
  const quantity = row.quantityReimbursedTotal;
  if (!row.approvalDate || quantity <= 0 || reason.includes("lost")) {
    return { status: "not_comparable", candidates: [] };
  }

  const movementType = reason.includes("damaged")
    ? "damaged"
    : reason.includes("removal")
      ? "removal"
      : null;
  if (!movementType) return { status: "not_comparable", candidates: [] };

  const approvalTimestamp = Date.parse(`${row.approvalDate}T00:00:00.000Z`);
  if (!Number.isFinite(approvalTimestamp)) return { status: "not_comparable", candidates: [] };

  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const candidates = movements.filter((movement) => {
    const movementTimestamp = Date.parse(movement.created_at);
    return movement.movement_type === movementType
      && Number.isFinite(movementTimestamp)
      && Math.abs(movementTimestamp - approvalTimestamp) <= windowMs
      && Math.abs(movement.quantity) >= quantity;
  });

  if (candidates.length === 0) return { status: "none", candidates: [] };
  return {
    status: candidates.length === 1 ? "candidate" : "ambiguous",
    candidates,
  };
}

export function deriveReconciliationStatus(
  movementStatus: MovementMatchStatus,
  hasExistingClaim: boolean,
): ReconciliationStatus {
  if (movementStatus === "candidate" || movementStatus === "ambiguous") {
    return "possible_duplicate_loss";
  }
  if (hasExistingClaim) return "possible_existing_claim";
  return "unrecorded_amazon_reimbursement";
}

function normalize(value: string | null): string {
  return value?.trim() || "";
}
