/** Generic SVG donut chart for any labelled preference distribution. */
export function MarketTrendDonutChart({ title, data = [], insight, emptyMessage = "No tenant preferences have been recorded yet." }) {
  const total = data.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);
  let offset = 0;

  return (
    <section aria-label={title} className="market-trend-donut-chart">
      {title && <h3>{title}</h3>}
      <div className="market-trend-donut-content">
      <svg viewBox="0 0 42 42" role="img" aria-label={title}>
        {total > 0 ? data.map((item, index) => {
          const portion = ((Number(item.value) || 0) / total) * 100;
          const segment = <circle key={item.label} className={`market-trend-donut-segment market-trend-donut-segment-${index % 6}`} cx="21" cy="21" r="15.9155" fill="transparent" strokeDasharray={`${portion} ${100 - portion}`} strokeDashoffset={-offset} />;
          offset += portion;
          return segment;
        }) : <circle cx="21" cy="21" r="15.9155" fill="transparent" strokeDasharray="100 0" />}
      </svg>
      {total > 0 && <div className="market-trend-donut-total"><strong>{total}</strong><span>Tenants</span></div>}
      </div>
      {data.length ? <ul>{data.map((item, index) => <li key={item.label}><i className={`market-trend-donut-key market-trend-donut-segment-${index % 6}`} /><span>{item.label}</span><strong>{item.value}</strong></li>)}</ul> : <p className="market-trend-chart-empty">{emptyMessage}</p>}
      {insight && <p>{insight}</p>}
    </section>
  );
}
