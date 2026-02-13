import type { OrderStatus } from "@/types/order";

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const label: Record<OrderStatus, string> = {
    pending: "Pending",
    paid: "Paid",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
  };

  return (
    <span className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
      {label[status]}
    </span>
  );
}