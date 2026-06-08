export interface ApartmentRoom {
  id?: string;
  name?: string;
  price?: number;
  sqft?: number;
  maxOccupants?: number;
  isOccupied?: boolean;
  hasPrivateBath?: boolean;
  bathroomType?: string;
  sharedBathLocation?: string;
  hasAC?: boolean;
}

export interface Apartment {
  id: string;
  title: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  image: string;
  images: string[];
  description: string;
  amenities: string[];
  availableDate: string;
  petFriendly: boolean;
  parking: boolean;
  furnished: boolean;
  /** Legacy boolean flag or list of included utility names */
  utilities: boolean | string[];
  lat: number;
  lng: number;
  landlordId?: string;
  isPublished?: boolean;
  rooms?: ApartmentRoom[];
  location?: string;
  wifi?: boolean;
  features?: Record<string, unknown> | string[];
}

/** Apartment record with optional dashboard / legacy fields */
export type ListingRecord = Apartment & Record<string, unknown>;

function utilitiesToFormFlag(utilities: Apartment['utilities']): boolean {
  return Array.isArray(utilities) ? utilities.length > 0 : utilities;
}

export interface ApartmentFormValues {
  title: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  image: string;
  images: string;
  description: string;
  amenities: string;
  availableDate: string;
  petFriendly: boolean;
  parking: boolean;
  furnished: boolean;
  utilities: boolean;
  utilityItems?: string[];
  customFeatures?: string[];
  verification?: Record<string, string>;
  lat: string;
  lng: string;
  isPublished: boolean;
  landlordId: string;
}

export interface ApartmentImageRow {
  url: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
}

export interface ApartmentRoomRow {
  id?: string | null;
  room_type?: string | null;
  sqft?: number | string | null;
  max_occupants?: number | string | null;
  rent?: number | string | null;
  has_private_bath?: boolean | null;
  bathroom_type?: string | null;
  shared_bath_location?: string | null;
  has_ac?: boolean | null;
  is_occupied?: boolean | null;
}

export interface ApartmentRow {
  id?: string;
  title: string | null;
  price: number | string | null;
  bedrooms: number | string | null;
  bathrooms: number | string | null;
  sqft: number | string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  description: string | null;
  amenities: string[] | string | null;
  available_date?: string | null;
  pet_friendly: boolean | null;
  parking: boolean | null;
  furnished: boolean | null;
  utilities: string[] | null;
  lat: number | string | null;
  lng: number | string | null;
  landlord_id: string | null;
  is_published: boolean | null;
  features?: Record<string, unknown> | null;
  created_at?: string | null;
  apartment_images?: ApartmentImageRow[] | null;
  apartment_rooms?: ApartmentRoomRow[] | null;
}

export interface ApartmentInsertRow {
  title: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  description: string;
  amenities: string[];
  pet_friendly: boolean;
  parking: boolean;
  furnished: boolean;
  utilities: string[];
  lat: number;
  lng: number;
  landlord_id?: string;
  is_published: boolean;
  features: Record<string, unknown>;
}

const EMPTY_FORM_VALUES: ApartmentFormValues = {
  title: '',
  price: '',
  bedrooms: '',
  bathrooms: '',
  sqft: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  image: '',
  images: '',
  description: '',
  amenities: '',
  availableDate: new Date().toISOString().slice(0, 10),
  petFriendly: false,
  parking: false,
  furnished: false,
  utilities: false,
  lat: '',
  lng: '',
  isPublished: true,
  landlordId: '',
};

export const apartments: Apartment[] = [];

export const createEmptyApartmentFormValues = (): ApartmentFormValues => ({
  ...EMPTY_FORM_VALUES,
});

const toNumber = (value: string | number | null | undefined, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

const toBoolean = (value: boolean | null | undefined): boolean => value === true;

const toString = (value: string | null | undefined, fallback = ''): string => {
  if (typeof value === 'string') {
    return value;
  }

  return fallback;
};

export const parseStringList = (value: string[] | string | null | undefined): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getAvailableDate = (row: ApartmentRow): string => {
  const featureDate = row.features && typeof row.features.availableDate === 'string' ? row.features.availableDate : null;

  return toString(row.available_date ?? featureDate ?? row.created_at, new Date().toISOString().slice(0, 10));
};

const getPrimaryImage = (images: string[], fallback = ''): string => {
  if (images.length > 0) {
    return images[0];
  }

  return fallback;
};

export const apartmentRowToApartment = (row: ApartmentRow): Apartment => {
  const images = row.apartment_images
    ? row.apartment_images
        .slice()
        .sort((left, right) => {
          const leftPrimary = left.is_primary === true ? 1 : 0;
          const rightPrimary = right.is_primary === true ? 1 : 0;

          if (leftPrimary !== rightPrimary) {
            return rightPrimary - leftPrimary;
          }

          return (left.sort_order ?? 0) - (right.sort_order ?? 0);
        })
        .map((image) => toString(image.url))
        .filter(Boolean)
    : [];

  const primaryImage = getPrimaryImage(images);

  return {
    id: row.id ?? '',
    title: toString(row.title),
    price: toNumber(row.price),
    bedrooms: toNumber(row.bedrooms),
    bathrooms: toNumber(row.bathrooms),
    sqft: toNumber(row.sqft),
    address: toString(row.address),
    city: toString(row.city),
    state: toString(row.state),
    zip: toString(row.zip),
    image: primaryImage,
    images: images.length > 0 ? images : primaryImage ? [primaryImage] : [],
    description: toString(row.description),
    amenities: parseStringList(row.amenities),
    availableDate: getAvailableDate(row),
    petFriendly: toBoolean(row.pet_friendly),
    parking: toBoolean(row.parking),
    furnished: toBoolean(row.furnished),
    utilities: row.utilities ?? [],
    lat: toNumber(row.lat),
    lng: toNumber(row.lng),
    landlordId: row.landlord_id ?? undefined,
    isPublished: row.is_published ?? undefined,
    rooms: row.apartment_rooms?.map((room) => ({
      id: room.id ?? undefined,
      name: toString(room.room_type),
      price: toNumber(room.rent),
      sqft: toNumber(room.sqft),
      maxOccupants: toNumber(room.max_occupants, 1),
      isOccupied: toBoolean(room.is_occupied),
      hasPrivateBath: toBoolean(room.has_private_bath),
      bathroomType: toString(room.bathroom_type),
      sharedBathLocation: toString(room.shared_bath_location),
      hasAC: toBoolean(room.has_ac),
    })),
  };
};

export const apartmentFormValuesFromApartment = (apartment: Apartment | null | undefined): ApartmentFormValues => {
  if (!apartment) {
    return createEmptyApartmentFormValues();
  }

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
  };
};

export const apartmentFormValuesToInsertRow = (
  values: ApartmentFormValues,
  landlordId?: string,
): ApartmentInsertRow => {
  const resolvedLandlordId = (landlordId ?? values.landlordId ?? '').trim();
  
  if (!resolvedLandlordId) {
    throw new Error('Landlord ID is required to create an apartment.');
  }

  const customFeatures = (values.customFeatures ?? [])
    .map((feature) => feature.trim())
    .filter(Boolean);
  const verification = Object.fromEntries(
    Object.entries(values.verification ?? {}).filter(([, value]) => value.trim().length > 0),
  );

  return {
    title: values.title.trim(),
    price: toNumber(values.price),
    bedrooms: toNumber(values.bedrooms),
    bathrooms: toNumber(values.bathrooms),
    sqft: toNumber(values.sqft),
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    zip: values.zip.trim(),
    description: values.description.trim(),
    amenities: parseStringList(values.amenities),
    pet_friendly: values.petFriendly,
    parking: values.parking,
    furnished: values.furnished,
    utilities: values.utilityItems?.length
      ? values.utilityItems.map((item) => item.trim()).filter(Boolean)
      : values.utilities
        ? ['Utilities Included']
        : [],
    lat: toNumber(values.lat),
    lng: toNumber(values.lng),
    landlord_id: resolvedLandlordId,
    is_published: values.isPublished,
    features: {
      availableDate: values.availableDate,
      customFeatures,
      verification,
    },
  };
};

export const apartmentFormValuesToUpdateRow = (
  values: ApartmentFormValues,
  landlordId?: string,
): ApartmentInsertRow => apartmentFormValuesToInsertRow(values, landlordId);

export {
  getCurrentSessionUser,
  getCurrentUserId,
  isApartmentFavorite,
  getFavoriteApartmentIds,
  fetchApartments,
  getApartmentById,
  createApartment,
  updateApartment,
  deleteApartment,
  toggleFavorite,
  reportApartment,
  resolveAppUserId,
  getLandlordVerification,
  listFavoriteApartments,
  fetchApartmentWithImages,
  insertApartmentImages,
  insertApartmentRooms,
  fetchApartmentsForLandlord,
} from '../services/apartmentsService';
