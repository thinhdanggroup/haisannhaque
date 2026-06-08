import { MessageCircle, Phone, Send } from "lucide-react";

const contactActions = [
  {
    label: "Messenger",
    href: "#messenger",
    icon: MessageCircle,
  },
  {
    label: "Zalo",
    href: "#zalo",
    icon: Send,
  },
  {
    label: "Hotline",
    href: "tel:19000098",
    icon: Phone,
  },
];

export function FloatingContactActions() {
  return (
    <div
      id="messenger"
      className="fixed right-4 bottom-6 z-40 hidden flex-col gap-2 md:flex"
      aria-label="Liên hệ nhanh"
    >
      {contactActions.map((action) => {
        const Icon = action.icon;

        return (
          <a
            key={action.label}
            id={action.label === "Zalo" ? "zalo" : undefined}
            href={action.href}
            className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-lg transition hover:border-teal-500 hover:text-teal-700"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{action.label}</span>
          </a>
        );
      })}
    </div>
  );
}
