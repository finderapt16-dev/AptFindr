/**
 * Generic bar-chart building block for market preference data. It deliberately
 * receives all labels and values through props, so it has no chart-specific or
 * mock data embedded in it.
 */
export function MarketTrendBarChart({ title, data = [], labels, values, insight, emptyMessage = "No tenant preferences have been recorded yet." }) {
  const series = data.length
    ? data
    : (labels ?? []).map((label, index) => ({ label, value: values?.[index] ?? 0 }));
  const maximum = Math.max(...series.map((item) => Number(item.value) || 0), 1);

  return (
    <section aria-label={title} className="market-trend-bar-chart">
      {title && <h3>{title}</h3>}
      {series.length ? series.map((item) => (
        <div key={item.label} className="market-trend-bar-row">
          <span>{item.label}</span>
          <div aria-hidden="true" className="market-trend-bar-track"><i style={{ width: `${((Number(item.value) || 0) / maximum) * 100}%` }} /></div>
          <strong>{item.value}</strong>
        </div>
      )) : <p className="market-trend-chart-empty">{emptyMessage}</p>}
      {insight && <p>{insight}</p>}
    </section>
  );
}
