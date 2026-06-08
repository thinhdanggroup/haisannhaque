import type { ReactNode } from "react";

type CheckoutPanelProps = {
  children: ReactNode;
  title: string;
};

export function CheckoutPanel({ children, title }: CheckoutPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
