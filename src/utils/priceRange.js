export function getRoomPriceRange(
  apartment,
  roomPrices = []
) {
  // Remove invalid room prices
  const validRoomPrices = roomPrices
    .map((price) => Number(price))
    .filter(
      (price) =>
        Number.isFinite(price) &&
        price > 0
    );


  // =========================================
  // PRIORITY 1:
  // Use actual room prices
  // =========================================

  if (validRoomPrices.length > 0) {
    const minimumRent =
      Math.min(...validRoomPrices);

    const maximumRent =
      Math.max(...validRoomPrices);

    const formatted =
      minimumRent === maximumRent
        ? `₱${minimumRent.toLocaleString(
            "en-PH"
          )} / month`
        : `₱${minimumRent.toLocaleString(
            "en-PH"
          )} – ₱${maximumRent.toLocaleString(
            "en-PH"
          )} / month`;

    return {
      min: minimumRent,
      max: maximumRent,
      formatted,
    };
  }


  // =========================================
  // PRIORITY 2:
  // Saved price range
  // =========================================

  const savedPriceRange =
    apartment?.features &&
    !Array.isArray(apartment.features)
      ? apartment.features.priceRange
      : null;


  const savedMinimumRent =
    Number(savedPriceRange?.min);

  const savedMaximumRent =
    Number(savedPriceRange?.max);


  const hasSavedPriceRange =
    Number.isFinite(savedMinimumRent) &&
    savedMinimumRent > 0 &&
    Number.isFinite(savedMaximumRent) &&
    savedMaximumRent >=
      savedMinimumRent;


  if (hasSavedPriceRange) {
    return {
      min: savedMinimumRent,
      max: savedMaximumRent,

      formatted:
        savedMinimumRent ===
        savedMaximumRent
          ? `₱${savedMinimumRent.toLocaleString(
              "en-PH"
            )} / month`
          : `₱${savedMinimumRent.toLocaleString(
              "en-PH"
            )} – ₱${savedMaximumRent.toLocaleString(
              "en-PH"
            )} / month`,
    };
  }


  // =========================================
  // PRIORITY 3:
  // Apartment base price
  // =========================================

  const apartmentPrice =
    Number(apartment?.price || 0);


  if (apartmentPrice > 0) {
    return {
      min: apartmentPrice,
      max: apartmentPrice,

      formatted:
        `₱${apartmentPrice.toLocaleString(
          "en-PH"
        )} / month`,
    };
  }


  // =========================================
  // NO PRICE
  // =========================================

  return {
    min: 0,
    max: 0,
    formatted: "Rent not set",
  };
}