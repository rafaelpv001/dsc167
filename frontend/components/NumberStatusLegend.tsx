const ITEMS = [
  { color: 'bg-emerald-500', label: 'Disponível' },
  { color: 'bg-amber-400', label: 'Reservado / aguardando pagamento' },
  { color: 'bg-rose-600', label: 'Pago / indisponível' },
];

export function NumberStatusLegend() {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-off-white/80">
      {ITEMS.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${item.color}`} aria-hidden />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
