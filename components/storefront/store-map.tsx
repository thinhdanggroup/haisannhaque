// Exact pin of Chi nhánh 1 (resolved from the directions link below); an
// address query drops several pins across The Sun Avenue towers.
const STORE_COORDINATES = "10.7846966,106.7462846";
const STORE_DIRECTIONS_URL = "https://maps.app.goo.gl/dDcQBkY8U8aV6TBb9";

export function StoreMap() {
  return (
    <div className="flex flex-col gap-2">
      <iframe
        src={`https://www.google.com/maps?q=${STORE_COORDINATES}&z=17&output=embed`}
        title="Bản đồ Hải Sản Nhà Quê – Chi nhánh 1"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-44 w-full rounded-lg border-0 bg-teal-900"
      />
      <a
        href={STORE_DIRECTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit text-xs font-bold text-orange-200 transition hover:text-white"
      >
        Chỉ đường →
      </a>
    </div>
  );
}
