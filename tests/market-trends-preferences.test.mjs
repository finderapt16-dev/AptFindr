import assert from "node:assert/strict";
import test from "node:test";
import { formatTenantPreferenceAnalytics } from "../src/utils/marketTrendsUtils.js";

test("formats aggregate preference analytics using the supplied valid-response denominators", () => {
  const charts = formatTenantPreferenceAnalytics({
    preferredAreas: [{ label: "Baldoza", value: 2 }],
    bedrooms: [{ label: "2", value: 2 }, { label: "any", value: 1 }],
    roomCapacity: [{ label: "2", value: 3 }],
    priceRanges: [{ min: 5000, max: 7000, value: 2 }],
    amenities: [{ label: "Wi-Fi", value: 3 }, { label: "Parking", value: 1 }],
    responseCounts: {
      preferredAreas: 2,
      bedrooms: 3,
      roomCapacity: 3,
      priceRanges: 2,
      amenities: 3,
    },
  });

  assert.equal(charts.preferredAreas.responseCount, 2);
  assert.equal(charts.bedrooms.responseCount, 3);
  assert.equal(charts.priceRanges.data.find((item) => item.label.includes("5,000")).value, 2);
  assert.equal(charts.amenities.responseCount, 3);
  assert.equal(charts.amenities.data.find((item) => item.label === "Wi-Fi").value, 3);
});
