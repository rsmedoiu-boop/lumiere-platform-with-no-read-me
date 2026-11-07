import type { Metadata } from "next";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default function OrdersPage() {
  return (
    <div>
      <h1 className="text-5xl">Orders</h1>
      <p className="mt-4 max-w-md text-ink-soft">Your receipts will appear here after your first purchase.</p>
    </div>
  );
}
