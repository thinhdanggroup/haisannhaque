type AdminOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h1 className="text-2xl font-semibold">Order detail</h1>
      <p className="mt-3 text-sm text-slate-600">Order ID: {id}</p>
    </div>
  );
}
