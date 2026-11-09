import type { Theme } from "./theme";

// How the state paid a vendor: with a state purchase card (P-card), or by
// check or ACH against an invoice (a purchase order or contract). Every vendor
// row comes from one of the two sources, so every row gets one chip.
export const PCARD_TITLE =
  "Paid with a state purchase card (P-card). Card buys skip the purchase order and the vendor invoice, so they only show up in the state's card transaction data.";
export const INVOICE_TITLE =
  "Paid to the vendor by check or ACH under a contract or purchase order, not by card.";

export function PayType({ t, pcard }: { t: Theme; pcard: boolean }) {
  return (
    <span
      title={pcard ? PCARD_TITLE : INVOICE_TITLE}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${pcard ? t.badgePcard : t.badgeInvoice}`}
    >
      {pcard ? "P-Card" : "Contract"}
    </span>
  );
}
