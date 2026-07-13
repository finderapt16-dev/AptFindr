import { ArrowRight, Bath, Bed, Building2, Loader2, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useApartmentsContext } from "../../contexts/ApartmentsContext";
import type { Apartment } from "../../data/apartments";
import { getImageUrl } from "../../utils/images";
import { isTenantVisibleApartment } from "../../utils/listingVisibility";
import { VerifiedBadge } from "../common/VerifiedBadge";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Button } from "../ui/button";

const PREVIEW_LIMIT = 6;

function resolveApartmentImage(image: string): string {
  if (!image) {
    return getImageUrl("modern-loft-apartment");
  }
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  return getImageUrl(image);
}

function PreviewCard({
  apartment,
  onApartmentClick,
}: {
  apartment: Apartment;
  onApartmentClick: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -8, scale: 1.015 }}
    >
      <Link
        to={`/apartment/${apartment.id}`}
        onClick={onApartmentClick}
        className="group block bg-white/90 backdrop-blur border-2 border-amber-100 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:border-amber-300 transition-all duration-300"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <ImageWithFallback
            src={resolveApartmentImage(apartment.image)}
            alt={apartment.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.span
            className="absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-white/20 blur-xl"
            animate={{ x: ["0%", "420%"] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
          />
          {apartment.landlordVerified === true && (
            <VerifiedBadge label="Verified Landlord" className="absolute left-3 top-3 bg-white/95 shadow-lg backdrop-blur-sm" />
          )}
          {apartment.petFriendly && (
            <span className="absolute top-12 left-3 px-2.5 py-1 rounded-full bg-white/90 text-xs font-bold text-emerald-700 shadow">
              Pet friendly
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-black text-lg text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2">
              {apartment.title}
            </h3>
            <p className="shrink-0 text-sm font-black text-orange-600">View room prices</p>
          </div>
          <div className="flex items-center text-slate-600 text-sm mb-3">
            <MapPin className="h-4 w-4 mr-1 text-amber-500 flex-shrink-0" />
            <span className="truncate">
              {[apartment.city, apartment.state].filter(Boolean).join(", ") || apartment.address || "La Paz, Iloilo"}
            </span>
          </div>
          <article className="flex items-center gap-4 text-sm text-slate-600 pt-3 border-t border-amber-100">
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4 text-amber-600" />
              {apartment.bedrooms} bed
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4 text-orange-600" />
              {apartment.bathrooms} bath
            </span>
            {apartment.sqft > 0 && <span className="text-slate-500">{apartment.sqft} sqft</span>}
          </article>
        </div>
      </Link>
    </motion.div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="bg-white/80 border-2 border-amber-100 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-amber-100" />
      <div className="p-5 space-y-3">
        <span className="h-5 bg-amber-100 rounded w-3/4" />
        <div className="h-4 bg-amber-50 rounded w-1/2" />
        <div className="h-4 bg-amber-50 rounded w-full" />
      </div>
    </div>
  );
}

interface LandingApartmentPreviewProps {
  onBrowseClick: (e: React.MouseEvent) => void;
}

export function LandingApartmentPreview({ onBrowseClick }: LandingApartmentPreviewProps) {
  const { apartments, isLoading, error } = useApartmentsContext();

  const publishedApartments = useMemo(
    () =>
      apartments
        .filter(isTenantVisibleApartment)
        .sort((a, b) => new Date(b.availableDate).getTime() - new Date(a.availableDate).getTime()),
    [apartments],
  );

  const previewApartments = publishedApartments.slice(0, PREVIEW_LIMIT);

  if (isLoading) {
    return (
      <section className="py-20 bg-gradient-to-b from-amber-50/50 to-white/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">Verified Listing Preview</h2>
            <p className="text-lg text-slate-600 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              Loading apartment records...
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {Array.from({ length: 3 }).map((_, index) => (
              <PreviewSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (previewApartments.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-amber-50/50 to-white/50">
      <div className="container mx-auto px-4">
        <section className="text-center mb-12 block">
          <div className="inline-block mb-4 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full shadow-sm">
            <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent uppercase tracking-wider flex items-center justify-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-amber-500" />
              Centralized listing data
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">Available Apartments in La Paz</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {publishedApartments.length}{" "}
            {publishedApartments.length === 1 ? "listing" : "listings"} available now. Open a card to review photos,
            rent details, location, amenities, and landlord information.
            {error ? " Some listings may be unavailable." : ""}
          </p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {previewApartments.map((apartment) => (
            <PreviewCard key={apartment.id} apartment={apartment} onApartmentClick={onBrowseClick} />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/browse" onClick={onBrowseClick}>
            <Button
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold px-8 inline-flex items-center gap-2 shadow-lg"
            >
              {publishedApartments.length > PREVIEW_LIMIT
                ? `View all ${publishedApartments.length} listings`
                : "Browse all listings"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function LandingListingsSection({
  onBrowseClick,
}: {
  onBrowseClick: (e: React.MouseEvent) => void;
}) {
  const { apartments, isLoading } = useApartmentsContext();

  const hasPublishedApartments = useMemo(
    () => apartments.some(isTenantVisibleApartment),
    [apartments],
  );

  if (isLoading || hasPublishedApartments) {
    return <LandingApartmentPreview onBrowseClick={onBrowseClick} />;
  }

  return <LandingListingsPlaceholder onBrowseClick={onBrowseClick} />;
}

export function LandingListingsPlaceholder({
  onBrowseClick,
}: {
  onBrowseClick: (e: React.MouseEvent) => void;
}) {
  return (
    <section className="py-20 bg-gradient-to-b from-amber-50/50 to-white/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">Explore Verified Listings</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            No published apartments yet. Landlords can submit apartment and permit information for admin review.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <motion.article
            className="group relative rounded-3xl overflow-hidden h-80 cursor-pointer shadow-xl"
            onClick={onBrowseClick}
            onKeyDown={(e) => e.key === "Enter" && onBrowseClick(e as unknown as React.MouseEvent)}
            role="button"
            tabIndex={0}
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55 }}
            whileHover={{ y: -8, scale: 1.015 }}
          >
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1654506012740-09321c969dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcGFydG1lbnQlMjBpbnRlcmlvciUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzcyMTg1Njk0fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Apartment interior example"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
            <motion.div
              className="absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-white/20 blur-xl"
              animate={{ x: ["0%", "420%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h3 className="text-3xl font-black text-white mb-2">Verified rental data</h3>
              <p className="text-amber-100 mb-4">Photos, amenities, rent, availability, and landlord details</p>
              <span className="inline-flex items-center text-amber-300 font-bold group-hover:translate-x-2 transition-transform">
                Browse listings <ArrowRight className="ml-2 h-5 w-5" />
              </span>
            </div>
          </motion.article>

          <motion.div
            className="group relative rounded-3xl overflow-hidden h-80 cursor-pointer shadow-xl"
            onClick={onBrowseClick}
            onKeyDown={(e) => e.key === "Enter" && onBrowseClick(e as unknown as React.MouseEvent)}
            role="button"
            tabIndex={0}
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            whileHover={{ y: -8, scale: 1.015 }}
          >
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1754298994778-514e0a285479?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9wZXJ0eSUyMG1hcCUyMGxvY2F0aW9uJTIwcGlufGVufDF8fHx8MTc3MjE5MjMzOHww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Map location example"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
            <motion.div
              className="absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-white/20 blur-xl"
              animate={{ x: ["0%", "420%"] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h3 className="text-3xl font-black text-white mb-2">GIS map browsing</h3>
              <p className="text-orange-100 mb-4">Compare apartment locations within La Paz before visiting</p>
              <span className="inline-flex items-center text-orange-300 font-bold group-hover:translate-x-2 transition-transform">
                Open map view <ArrowRight className="ml-2 h-5 w-5" />
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
