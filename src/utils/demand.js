// src/utils/demand.js

/**
 * Demand Algorithm
 *
 * Views     = 40%
 * Favorites = 40%
 * Rating    = 20%
 *
 * Demand Levels:
 * 0 - 49   = Low Demand
 * 50 - 79  = Medium Demand
 * 80 - 100 = High Demand
 */


/**
 * Makes sure a value stays between 0 and 100.
 */
const clampScore = (value) => {
  return Math.min(100, Math.max(0, value));
};


/**
 * Normalize a value to a 0-100 score.
 *
 * Example:
 * apartment views = 80
 * highest views = 100
 *
 * normalized score = 80
 */
const normalize = (value, maximum) => {
  const numericValue = Number(value || 0);
  const numericMaximum = Number(maximum || 0);

  if (numericMaximum <= 0) {
    return 0;
  }

  return clampScore(
    (numericValue / numericMaximum) * 100
  );
};


/**
 * Converts the final demand score
 * into Low / Medium / High.
 */
export function getDemandLevel(score) {
  const numericScore = Number(score || 0);

  if (numericScore >= 80) {
    return "High Demand";
  }

  if (numericScore >= 50) {
    return "Medium Demand";
  }

  return "Low Demand";
}


/**
 * Calculate demand scores for all apartments.
 *
 * Every apartment should contain:
 *
 * {
 *   views,
 *   favorites,
 *   ratingAverage
 * }
 */
export function calculateDemandScores(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }


  // =========================================
  // FIND HIGHEST VIEW COUNT
  // =========================================

  const maximumViews = Math.max(
    ...entries.map((item) =>
      Number(item.views || 0)
    ),
    0
  );


  // =========================================
  // FIND HIGHEST FAVORITE COUNT
  // =========================================

  const maximumFavorites = Math.max(
    ...entries.map((item) =>
      Number(item.favorites || 0)
    ),
    0
  );


  // =========================================
  // CALCULATE EACH APARTMENT
  // =========================================

  return entries.map((item) => {

    // -----------------------------------------
    // VIEWS
    // -----------------------------------------

    const normalizedViews = normalize(
      item.views,
      maximumViews
    );


    // -----------------------------------------
    // FAVORITES
    // -----------------------------------------

    const normalizedFavorites = normalize(
      item.favorites,
      maximumFavorites
    );


    // -----------------------------------------
    // RATING
    //
    // Rating is 0-5.
    // Convert it to 0-100.
    //
    // Example:
    // 4.5 / 5 * 100 = 90
    // -----------------------------------------

    const normalizedRating =
      item.ratingAverage !== null &&
      item.ratingAverage !== undefined
        ? clampScore(
            (Number(item.ratingAverage) / 5) * 100
          )
        : 0;


    // =========================================
    // WEIGHTED DEMAND FORMULA
    //
    // Views     = 40%
    // Favorites = 40%
    // Rating    = 20%
    // =========================================

    const demandScore =
      normalizedViews * 0.4 +
      normalizedFavorites * 0.4 +
      normalizedRating * 0.2;

    const finalDemandScore =
      Math.round(demandScore * 1000) / 1000;


    return {
      ...item,

      normalizedViews,
      normalizedFavorites,
      normalizedRating,

      demandScore: finalDemandScore,

      marketLevel:
        getDemandLevel(finalDemandScore),
    };
  });
}

/**
 * Rank apartments by demand/popularity.
 *
 * Uses:
 * Views     = 40%
 * Favorites = 40%
 * Rating    = 20%
 *
 * Apartments with no views, favorites, or ratings
 * are excluded from Popular.
 */
export function rankApartmentsByDemand(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  return calculateDemandScores(entries)
    .filter((item) => {
      const views = Number(item.views || 0);
      const favorites = Number(item.favorites || 0);
      const ratingAverage = Number(item.ratingAverage || 0);

      return (
        views > 0 ||
        favorites > 0 ||
        ratingAverage > 0
      );
    })
    .sort((a, b) => {
      const scoreDifference =
        Number(b.demandScore || 0) -
        Number(a.demandScore || 0);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return String(a.id ?? "").localeCompare(
        String(b.id ?? "")
      );
    });
}