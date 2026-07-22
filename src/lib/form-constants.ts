/**
 * Shared form constants to eliminate duplication across modals and pages.
 * Used by: order-form-modal, sale-form-modal, product-form-modal,
 * supplier-form-modal, member-form-modal, research, settings, etc.
 */

/** Default input class for form fields */
export const inputClass = "h-9 bg-muted/50 border-border text-sm";

/** Default label class for form fields */
export const labelClass = "text-xs text-muted-foreground";

/** Section label class for form group headers */
export const sectionLabel = "flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-2 mt-1";

/**
 * Returns today's date as YYYY-MM-DD string for date inputs.
 * Previously duplicated in order-form-modal and sale-form-modal.
 */
export function getTodayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}
