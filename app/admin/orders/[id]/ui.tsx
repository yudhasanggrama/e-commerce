"use client";

import { useState } from "react";

export default function AdminOrderClient({ order, items }: { order: any; items: any[] }) {
  const [status, setStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  async function updateStatus(next: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      setStatus(json.status);
      alert("Updated");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Order Detail</h1>

      <div className="border rounded-lg p-3 space-y-1">
        <div className="font-mono text-sm">{order.id}</div>
        <div className="text-sm">Status: <b>{status}</b></div>
        <div className="text-sm">Payment: <b>{order.payment_status}</b></div>
        <div className="text-sm">Total: <b>Rp {order.total.toLocaleString("id-ID")}</b></div>
      </div>

      <div className="border rounded-lg p-3 space-y-2">
        <div className="font-medium">Items</div>
        {items.map((it) => (
          <div key={it.id} className="flex justify-between text-sm">
            <span>{it.name} x {it.quantity}</span>
            <span>Rp {(it.price * it.quantity).toLocaleString("id-ID")}</span>
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-3 space-y-2">
        <div className="font-medium">Update Status</div>
        <div className="flex gap-2 flex-wrap">
          <button className="border rounded px-3 py-2" disabled={loading} onClick={() => updateStatus("shipped")}>
            Mark Shipped
          </button>
          <button className="border rounded px-3 py-2" disabled={loading} onClick={() => updateStatus("completed")}>
            Mark Completed
          </button>
          <button className="border rounded px-3 py-2" disabled={loading} onClick={() => updateStatus("cancelled")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}