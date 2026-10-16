import { useState } from "react";
import NewSale from "../components/sales/NewSale";
import SalesHistory from "../components/sales/SalesHistory";
import ReceiptModal from "../components/ReceiptModal";

export default function SalesPage() {
  const [tab, setTab] = useState("new");
  const [receipt, setReceipt] = useState(null);

  return (
    <div className="space-y-5">
      <div role="tablist" className="tabs tabs-box w-fit">
        <button
          role="tab"
          className={`tab ${tab === "new" ? "tab-active" : ""}`}
          onClick={() => setTab("new")}
        >
          New sale
        </button>
        <button
          role="tab"
          className={`tab ${tab === "history" ? "tab-active" : ""}`}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      {tab === "new" ? (
        <NewSale onSaleCreated={setReceipt} />
      ) : (
        <SalesHistory onView={setReceipt} />
      )}

      <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}