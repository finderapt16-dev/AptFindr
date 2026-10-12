/**
 * Generic bar-chart building block for market preference data. It deliberately
 * receives all labels and values through props, so it has no chart-specific or
 * mock data embedded in it.
 */
export function MarketTrendBarChart({
  title,
  data = [],
  labels,
  values,
  responseCount,
  insight,
  variant = "rows",
  emptyMessage = "No tenant preferences have been recorded yet.",
}) {
  const suppliedData = Array.isArray(data) ? data : [];
  const series = suppliedData.length
    ? suppliedData
    : (labels ?? []).map((label, index) => ({ label, value: values?.[index] ?? 0 }));
  const recordedResponses = Number(responseCount);
  const total = Number.isFinite(recordedResponses) && recordedResponses >= 0
    ? recordedResponses
    : series.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);
  const percentageFor = (item) => total > 0 ? (Math.max(0, Number(item?.value) || 0) / total) * 100 : 0;
  const maximumPercentage = Math.max(...series.map(percentageFor), 1);

  if (variant === "columns") {
    return (
      <section aria-label={title} className="market-trend-bar-chart market-trend-bar-chart-columns">
        {title && <h3>{title}</h3>}
        {series.length ? <div className="market-trend-column-chart" role="img" aria-label={`${title}: ${series.map((item) => `${item.label}, ${total ? Math.round(((Number(item.value) || 0) / total) * 100) : 0} percent`).join("; ")}`}>
          <div aria-hidden="true" className="market-trend-column-grid" />
          <div className="market-trend-column-list" style={{ "--market-trend-column-count": series.length }}>
            {series.map((item) => {
              const percentage = Math.round(percentageFor(item));
              return <div key={item.label} className="market-trend-column-item">
                <strong>{percentage}%</strong>
                <i style={{ height: `${(percentage / maximumPercentage) * 100}%` }} />
                <span title={item.label}>{item.label}</span>
              </div>;
            })}
          </div>
        </div> : <p className="market-trend-chart-empty">{emptyMessage}</p>}
        {insight && <p className="market-trend-chart-insight">{insight}</p>}
      </section>
    );
  }

  return (
    <section aria-label={title} className="market-trend-bar-chart">
      {title && <h3>{title}</h3>}
      {series.length ? series.map((item) => (
        <div key={item.label} className="market-trend-bar-row">
          <span>{item.label}</span>
          <div aria-hidden="true" className="market-trend-bar-track"><i style={{ width: `${(percentageFor(item) / maximumPercentage) * 100}%` }} /></div>
          <strong>{Math.round(percentageFor(item))}%</strong>
        </div>
      )) : <p className="market-trend-chart-empty">{emptyMessage}</p>}
      {insight && <p className="market-trend-chart-insight">{insight}</p>}
    </section>
  );
}
