/**
 * Represents a single line item in an invoice.
 */
export interface InvoiceItem {
  itemName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

/**
 * Represents a full customer invoice, including subtotal calculations,
 * taxes, discounts, and round-offs.
 */
export interface Invoice {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  companyName?: string;
  purchasedBy: string;
  customerMobile: string;
  customerAddress: string;
  notes: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;       // Discount amount in Rupees (₹)
  taxableAmount: number;  // Base taxable amount after discount and before GST
  gst: number;            // GST amount in Rupees (₹) (standard 18% on taxable value)
  roundOff: number;       // Rounding adjustment (₹) to make grandTotal integer
  grandTotal: number;     // Grand Total in Rupees (₹)

  // Integration fields
  customerId?: number | null;
  customerContactId?: number | null;
  contactId?: number | null;
}
