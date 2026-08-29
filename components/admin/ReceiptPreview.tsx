"use client";

import { formatCurrency, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface ReceiptBillItem {
  id: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptPromotion {
  id: string;
  name: string;
  discountAmount: number;
}

export interface ReceiptBill {
  billNumber: string;
  subtotal: number;
  discount: number;
  serviceCharge: number;
  vat: number;
  grandTotal: number;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  receiptFooter: string | null;
  table: { name: string };
  createdBy?: { username: string } | null;
  items: ReceiptBillItem[];
  promotionSummary?: ReceiptPromotion[] | null;
}

const paymentLabels: Record<string, string> = {
  CASH: "เงินสด",
  BANK_TRANSFER: "โอนเงิน",
  PROMPTPAY: "พร้อมเพย์",
  CARD: "บัตร",
};

export function printReceiptElement(elementId: string) {
  const receiptElement = document.getElementById(elementId);
  if (!receiptElement) return;

  const printWindow = window.open("", "_blank", "width=520,height=720");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Print Receipt</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @page { size: auto; margin: 10mm; }
          * { box-sizing: border-box; }
          html {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #111;
            font-family: "Tahoma", "Sarabun", sans-serif;
            font-size: 14px;
          }
          .receipt-print-shell {
            width: 90mm;
            min-width: 90mm;
            margin: 0 auto;
            padding: 0;
          }
          .receipt-paper {
            width: 90mm !important;
            min-width: 90mm !important;
            max-width: 90mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
          }
          .receipt-center { text-align: center; }
          .receipt-kicker {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #59645f;
          }
          .receipt-title { margin: 6px 0 0; font-size: 22px; font-weight: 700; }
          .receipt-muted { color: #59645f; font-size: 13px; }
          .receipt-divider { margin: 16px 0; border-top: 1px dashed #777; }
          .receipt-strong-divider { margin: 16px 0; border-top: 1px dashed #111; }
          .receipt-stack { display: flex; flex-direction: column; gap: 10px; }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: flex-start;
          }
          .receipt-item-name { font-weight: 600; }
          .receipt-item-sub { color: #59645f; font-size: 12px; margin-top: 2px; }
          .receipt-price { white-space: nowrap; font-weight: 600; }
          .receipt-total { font-size: 24px; font-weight: 800; }
          .receipt-footer { text-align: center; color: #59645f; font-size: 12px; line-height: 1.55; }
          .no-print { display: none !important; }
          @media screen {
            body {
              padding: 16px 0;
            }
            .receipt-paper {
              padding: 18px !important;
              border: 1px solid #ddd !important;
            }
          }
          @media print {
            .receipt-print-shell {
              width: 90mm !important;
              min-width: 90mm !important;
            }
            .receipt-paper {
              width: 90mm !important;
              min-width: 90mm !important;
              max-width: 90mm !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-print-shell">${receiptElement.innerHTML}</div>
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export default function ReceiptPreview({
  bill,
  className,
}: {
  bill: ReceiptBill;
  className?: string;
}) {
  const itemCount = bill.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={cn(
        "receipt-paper mx-auto w-full max-w-[360px] rounded-[1.25rem] border border-[#d8c7b3] bg-white p-5 text-[#151a17] shadow-sm",
        className
      )}
    >
      <div className="receipt-center text-center">
        <p className="receipt-kicker text-xs font-semibold uppercase tracking-[0.22em] text-[#66736c]">
          ใบเสร็จรับเงิน
        </p>
        <h2 className="receipt-title mt-2 text-lg font-bold">Restaurant</h2>
        <p className="receipt-muted mt-1 text-xs text-[#66736c]">ขอบคุณที่ใช้บริการ</p>
      </div>

      <div className="receipt-divider my-4 border-t border-dashed border-[#9aa39c]" />

      <div className="receipt-stack space-y-1.5 text-xs">
        <ReceiptMetaRow label="เลขที่" value={bill.billNumber} strong />
        <ReceiptMetaRow label="โต๊ะ" value={bill.table.name} />
        <ReceiptMetaRow label="เวลา" value={formatDateTime(bill.paidAt || bill.createdAt)} />
        <ReceiptMetaRow label="ชำระ" value={paymentLabels[bill.paymentMethod] || bill.paymentMethod} />
        {bill.createdBy?.username && <ReceiptMetaRow label="แคชเชียร์" value={bill.createdBy.username} />}
      </div>

      <div className="receipt-divider my-4 border-t border-dashed border-[#9aa39c]" />

      <div className="receipt-stack space-y-3">
        <div className="receipt-row flex items-center justify-between text-xs font-semibold">
          <span>รายการ</span>
          <span>{itemCount} ชิ้น</span>
        </div>
        {bill.items.map((item) => (
          <div key={item.id} className="receipt-row grid grid-cols-[1fr_auto] gap-3 text-sm">
            <div className="min-w-0">
              <p className="receipt-item-name truncate font-medium">{item.menuItemName}</p>
              <p className="receipt-item-sub text-xs text-[#66736c]">
                {item.quantity} x {formatCurrency(item.unitPrice)}
              </p>
            </div>
            <p className="receipt-price font-semibold">{formatCurrency(item.totalPrice)}</p>
          </div>
        ))}
      </div>

      <div className="receipt-divider my-4 border-t border-dashed border-[#9aa39c]" />

      <div className="receipt-stack space-y-2 text-sm">
        <ReceiptTotalRow label="ยอดรวม" value={formatCurrency(bill.subtotal)} />
        {bill.discount > 0 && (
          <ReceiptTotalRow label="ส่วนลด" value={`-${formatCurrency(bill.discount)}`} discount />
        )}
        {bill.promotionSummary?.map((promotion) => (
          <ReceiptTotalRow
            key={promotion.id}
            label={promotion.name}
            value={`-${formatCurrency(promotion.discountAmount)}`}
            discount
          />
        ))}
        {bill.serviceCharge > 0 && (
          <ReceiptTotalRow label="Service" value={formatCurrency(bill.serviceCharge)} />
        )}
        {bill.vat > 0 && <ReceiptTotalRow label="VAT" value={formatCurrency(bill.vat)} />}
      </div>

      <div className="receipt-strong-divider my-4 border-t border-dashed border-[#151a17]" />

      <div className="receipt-row flex items-end justify-between gap-3">
        <span className="text-sm font-semibold">ยอดสุทธิ</span>
        <span className="receipt-total text-xl font-bold">{formatCurrency(bill.grandTotal)}</span>
      </div>

      <div className="receipt-divider my-4 border-t border-dashed border-[#9aa39c]" />

      <p className="receipt-footer text-center text-xs leading-5 text-[#66736c]">
        {bill.receiptFooter || "ขอบคุณค่ะ / ครับ"}
      </p>
    </div>
  );
}

function ReceiptMetaRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="receipt-row flex justify-between gap-3">
      <span className="text-[#66736c]">{label}</span>
      <span className={cn("text-right", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

function ReceiptTotalRow({
  label,
  value,
  discount,
}: {
  label: string;
  value: string;
  discount?: boolean;
}) {
  return (
    <div className="receipt-row flex justify-between gap-3">
      <span className="text-[#66736c]">{label}</span>
      <span className={cn("font-medium", discount && "text-[#b96526]")}>{value}</span>
    </div>
  );
}
