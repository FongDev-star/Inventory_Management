import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { money, PAYMENT_METHODS } from "../lib/format";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function printReceipt(sale) {
  const win = window.open("", "_blank", "width=380,height=640");
  if (!win) {
    toast.error("Allow pop-ups to print the receipt");
    return;
  }

  const rows = sale.items
    .map(
      (i) =>
        `<tr><td>${esc(i.name)}<br><small>${i.quantity} x ${money(i.price)}</small></td><td class="r">${money(i.subtotal)}</td></tr>`
    )
    .join("");

  win.document.write(`<!doctype html>
<html>
<head>
<title>${esc(sale.receiptNumber)}</title>
<style>
  body{font-family:ui-monospace,Menlo,monospace;font-size:12px;width:280px;margin:16px auto;color:#000}
  h1{font-size:16px;text-align:center;margin:0 0 4px}
  p{margin:2px 0;text-align:center}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  td{padding:4px 0;vertical-align:top}
  .r{text-align:right}
  .line{border-top:1px dashed #000;margin:8px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .total{font-size:14px;font-weight:bold}
</style>
</head>
<body>
  <h1>Receipt</h1>
  <p>${esc(sale.receiptNumber)}</p>
  <p>${esc(new Date(sale.createdAt).toLocaleString())}</p>
  <div class="line"></div>
  <div class="row"><span>Customer</span><span>${esc(sale.customerName)}</span></div>
  <div class="row"><span>Served by</span><span>${esc(sale.createdBy?.name || "-")}</span></div>
  <div class="row"><span>Payment</span><span>${esc(PAYMENT_METHODS[sale.paymentMethod])} / ${sale.paymentStatus === "paid" ? "Paid" : "Unpaid"}</span></div>
  <div class="line"></div>
  <table>${rows}</table>
  <div class="line"></div>
  <div class="row total"><span>Total</span><span>${money(sale.total)}</span></div>
  <p style="margin-top:16px">Thank you!</p>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export default function ReceiptModal({ sale, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (sale && !dialog.open) dialog.showModal();
    if (!sale && dialog.open) dialog.close();
  }, [sale]);

  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box max-w-md">
        {sale && (
          <>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Receipt</h3>
              <p className="font-mono text-sm opacity-70">{sale.receiptNumber}</p>
              <p className="text-xs opacity-60">
                {new Date(sale.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="opacity-60">Customer</span>
                <span>{sale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Served by</span>
                <span>{sale.createdBy?.name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Payment</span>
                <span>
                  {PAYMENT_METHODS[sale.paymentMethod]} ·{" "}
                  {sale.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                </span>
              </div>
            </div>

            <div className="divider my-3"></div>

            <ul className="space-y-3">
              {sale.items.map((i) => (
                <li key={i.product} className="flex justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs opacity-60">
                      {i.quantity} x {money(i.price)}
                    </p>
                  </div>
                  <span className="font-medium">{money(i.subtotal)}</span>
                </li>
              ))}
            </ul>

            <div className="divider my-3"></div>

            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{money(sale.total)}</span>
            </div>
          </>
        )}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={() => ref.current?.close()}>
            Close
          </button>
          {sale && (
            <button className="btn btn-primary" onClick={() => printReceipt(sale)}>
              Print
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}