export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="sf-page-enter">{children}</div>;
}
