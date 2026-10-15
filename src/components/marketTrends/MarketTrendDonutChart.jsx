
/**
 * Generic SVG donut chart for tenant preference distributions.
 * Each segment is colored according to its percentage.
 */

export function MarketTrendDonutChart({
  title,
  data = [],
  responseCount,
  insight,
  emptyMessage = "No tenant preferences have been recorded yet.",
}) {
  const series = Array.isArray(data) ? data : [];

  // AptFindr theme colors
  const COLORS = [
    "#0284C7",
    "#0EA5E9",
    "#38BDF8",
    "#7DD3FC",
    "#BAE6FD",
    "#E0F2FE",
  ];

  const suppliedResponseCount = Number(responseCount);

  const total =
    Number.isFinite(suppliedResponseCount) &&
    suppliedResponseCount >= 0
      ? suppliedResponseCount
      : series.reduce(
          (sum, item) =>
            sum + Math.max(0, Number(item.value) || 0),
          0
        );

  const totalValues = series.reduce(
    (sum, item) =>
      sum + Math.max(0, Number(item.value) || 0),
    0
  );

  // Use recorded category counts for actual segment sizes.
  const chartTotal = totalValues;

  let offset = 0;

  return (
    <section
      aria-label={title}
      className="market-trend-donut-chart"
    >
      {title && <h3>{title}</h3>}

      {series.length > 0 ? (
        <div className="market-trend-donut-layout">

          {/* DONUT CHART */}
          <div className="market-trend-donut-content">

            <svg
              viewBox="0 0 42 42"
              role="img"
              aria-label={`${title || "Preferences"} distribution`}
              className="market-trend-donut-svg"
            >
              {/* Background circle */}
              <circle
                cx="21"
                cy="21"
                r="15.9155"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="5"
              />

              {chartTotal > 0 &&
                series.map((item, index) => {
                  const value = Math.max(
                    0,
                    Number(item.value) || 0
                  );

                  const portion =
                    (value / chartTotal) * 100;

                  const segmentOffset = offset;

                  offset += portion;

                  if (portion <= 0) {
                    return null;
                  }

                  return (
                    <circle
                      key={`${item.label}-${index}`}
                      cx="21"
                      cy="21"
                      r="15.9155"
                      fill="none"
                      stroke={
                        COLORS[index % COLORS.length]
                      }
                      strokeWidth="5"
                      strokeDasharray={`${portion} ${
                        100 - portion
                      }`}
                      strokeDashoffset={-segmentOffset}
                      transform="rotate(-90 21 21)"
                      className="market-trend-donut-segment"
                    />
                  );
                })}
            </svg>

            {/* CENTER TEXT */}
            <div className="market-trend-donut-total">
              <strong>
                {chartTotal > 0 ? "100%" : "0%"}
              </strong>

              <span>
                {chartTotal > 0
                  ? "Responses"
                  : "No responses"}
              </span>
            </div>
          </div>

          {/* LEGEND */}
          <ul>
            {series.map((item, index) => {
              const value = Math.max(
                0,
                Number(item.value) || 0
              );

              const percentage =
                chartTotal > 0
                  ? Math.round(
                      (value / chartTotal) * 100
                    )
                  : 0;

              return (
                <li key={`${item.label}-${index}`}>
                  <i
                    className="market-trend-donut-key"
                    style={{
                      backgroundColor:
                        COLORS[index % COLORS.length],
                    }}
                  />

                  <span>{item.label}</span>

                  <strong>{percentage}%</strong>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="market-trend-chart-empty">
          {emptyMessage}
        </p>
      )}

      {insight && (
        <p className="market-trend-chart-insight">
          {insight}
        </p>
      )}
    </section>
  );
}
