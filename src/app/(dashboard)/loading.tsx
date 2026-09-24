export default function Loading() {
  return (
    <div role="status" aria-label="Carregando">
      <div className="skeleton h-10 w-60 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-36" />
        ))}
      </div>
      <div className="skeleton h-80 mt-6" />
      <span className="sr-only">Carregando dados…</span>
    </div>
  );
}
