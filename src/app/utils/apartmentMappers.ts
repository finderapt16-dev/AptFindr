import type { Apartment, ApartmentFormValues } from '../data/apartments';

function utilitiesToFormFlag(utilities: Apartment['utilities']): boolean {
  return Array.isArray(utilities) ? utilities.length > 0 : utilities;
}

export function apartmentToFormValues(apartment: Apartment): ApartmentFormValues {
  return {
    title: apartment.title,
    price: String(apartment.price),
    bedrooms: String(apartment.bedrooms),
    bathrooms: String(apartment.bathrooms),
    sqft: String(apartment.sqft),
    address: apartment.address,
    city: apartment.city,
    state: apartment.state,
    zip: apartment.zip,
    image: apartment.image,
    images: apartment.images.join(', '),
    description: apartment.description,
    amenities: apartment.amenities.join(', '),
    availableDate: apartment.availableDate,
    petFriendly: apartment.petFriendly,
    parking: apartment.parking,
    furnished: apartment.furnished,
    utilities: utilitiesToFormFlag(apartment.utilities),
    utilityItems: Array.isArray(apartment.utilities) ? apartment.utilities : [],
    lat: String(apartment.lat),
    lng: String(apartment.lng),
    isPublished: apartment.isPublished ?? true,
    landlordId: apartment.landlordId ?? '',
    status: apartment.status ?? 'available',
    rooms: apartment.rooms ?? [],
  };
}
