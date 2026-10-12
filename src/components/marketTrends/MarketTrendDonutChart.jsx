/** Generic SVG donut chart for any labelled preference distribution. */
export function MarketTrendDonutChart({ title, data = [], responseCount, insight, emptyMessage = "No tenant preferences have been recorded yet." }) {
  const series = Array.isArray(data) ? data : [];
  const suppliedResponseCount = Number(responseCount);
  const total = Number.isFinite(suppliedResponseCount) && suppliedResponseCount >= 0
    ? suppliedResponseCount
    : series.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);
  let offset = 0;

  return (
    <section aria-label={title} className="market-trend-donut-chart">
      {title && <h3>{title}</h3>}
      {series.length ? <div className="market-trend-donut-layout">
        <div className="market-trend-donut-content">
          <svg viewBox="0 0 42 42" role="img" aria-label={title}>
            {total > 0 ? series.map((item, index) => {
              const portion = (Math.max(0, Number(item.value) || 0) / total) * 100;
              const segment = <circle key={item.label} className={`market-trend-donut-segment market-trend-donut-segment-${index % 6}`} cx="21" cy="21" r="15.9155" fill="transparent" strokeDasharray={`${portion} ${100 - portion}`} strokeDashoffset={-offset} />;
              offset += portion;
              return segment;
            }) : <circle cx="21" cy="21" r="15.9155" fill="transparent" strokeDasharray="100 0" />}
          </svg>
          <div className="market-trend-donut-total"><strong>{total > 0 ? "100%" : "0%"}</strong><span>{total > 0 ? "Responses" : "No responses"}</span></div>
        </div>
        <ul>{series.map((item, index) => {
          const percentage = total ? Math.round(((Number(item.value) || 0) / total) * 100) : 0;
          return <li key={item.label}><i className={`market-trend-donut-key market-trend-donut-segment-${index % 6}`} /><span>{item.label}</span><strong>{percentage}%</strong></li>;
        })}</ul>
      </div> : <p className="market-trend-chart-empty">{emptyMessage}</p>}
      {insight && <p className="market-trend-chart-insight">{insight}</p>}
    </section>
  );
}
