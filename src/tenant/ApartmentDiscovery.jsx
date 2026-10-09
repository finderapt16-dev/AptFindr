import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/tenant/useFavorites";
import { isTenantRole } from "@/services/authService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getImageUrl } from "@/utils/images";
import { Card, CardContent } from "@/components/ui/card";
import { ApartmentRatingSummary } from "@/components/ApartmentRatingSummary";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { EmptyState } from "@/tenant/EmptyState";
export const SuggestedSection = ({ hasPersonalizationPreferences, preferencesLoading, suggestedApartments, ratingSummary, ratingsLoading, navigate, }) => (<div className="suggested-page">
    <section className="suggested-hero">
      <div className="suggested-section-panel">
        <div className="suggested-section-card">
          <Sparkles className="suggested-section-sparkles-icon"/>
          {hasPersonalizationPreferences ? "Based on Your Preferences" : "Apartment Listings"}
        </div>
        <h2 className="suggested-section-heading">{hasPersonalizationPreferences ? "Recommended for You" : "Find Apartments for You"}</h2>
        <p className="suggested-section-text">{hasPersonalizationPreferences ? "Apartment suggestions based on your preferences." : "Set your preferences to receive personalized apartment suggestions."}</p>
      </div>
    </section>
    <div className="suggested-section-row">
      <Button onClick={() => navigate("/browse")} variant="outline" className="suggested-section-browse-all">View Apartments</Button>
    </div>
    {preferencesLoading ? (<div className="suggested-section-card-2"><Loader2 className="suggested-section-loader2-icon"/></div>) : !hasPersonalizationPreferences ? (<EmptyState icon={Sparkles} message="Set your preferences to receive personalized apartment suggestions." actionLabel="Set Preferences" action={() => navigate("/browse?preferences=open")}/>) : suggestedApartments.length > 0 ? (<div className="suggested-section-grid">
        {suggestedApartments.map((apartment) => (<div key={apartment.id} className="suggested-card">
            <Badge className="suggested-section-suggested">Recommended</Badge>
            <ApartmentCard apartment={apartment} ratingStats={ratingSummary.byApartment.get(apartment.id)} ratingsLoading={ratingsLoading} detailState={{ returnTo: "/tenant/dashboard?section=suggested", backLabel: "Back to Recommended" }}/>
          </div>))}
      </div>) : (<EmptyState icon={Sparkles} message="No apartments currently match your preferences." actionLabel="Adjust Preferences" action={() => navigate("/browse?preferences=open")}/>)}
  </div>);
export const PopularSection = ({ popularApartments, ratingSummary, ratingsLoading, navigate, }) => (<div className="popular-page">
    <section className="popular-hero">
      <div className="popular-section-panel">
        <div className="popular-section-trending-choices">
          <TrendingUp className="popular-section-trending-up-icon"/>
          Trending Choices
        </div>
        <h2 className="popular-section-popular-apartments">Popular Apartments</h2>
        <p className="popular-section-text">Explore apartments receiving more interest from AptFindr users through views and favorites.</p>
      </div>
    </section>
    <div className="popular-section-row">
      <Button onClick={() => navigate("/browse")} variant="outline" className="popular-section-browse-all">View Apartments</Button>
    </div>
    {popularApartments.length > 0 ? (<div className="popular-section-grid">
        {popularApartments.map((apartment) => (<div key={apartment.id} className="popular-card">
            <Badge className="popular-section-popular">Popular</Badge>
            <ApartmentCard apartment={apartment} ratingStats={ratingSummary.byApartment.get(apartment.id)} ratingsLoading={ratingsLoading} detailState={{ returnTo: "/tenant/dashboard?section=popular", backLabel: "Back to Popular" }}/>
          </div>))}
      </div>) : (<EmptyState icon={TrendingUp} message="No popular apartments available right now."/>)}
  </div>);
const STATUS_BADGE = {
    available: "apartment-card-badge",
    occupied: "apartment-card-badge-2",
    maintenance: "apartment-card-badge-3",
};
const STATUS_LABEL = {
    available: "Available",
    occupied: "Occupied",
    maintenance: "Under Maintenance",
};
export function ApartmentCard({ apartment, detailState, ratingStats, ratingsLoading, onApartmentClick, showGuestFavorite = false }) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const { user } = useAuth();
    const favorite = isFavorite(apartment.id);
    const isOwnListing = user?.role === "landlord" && apartment.landlordId === user.id;
    const showFavoriteButton = (isTenantRole(user?.role) || (showGuestFavorite && !user)) && !isOwnListing;
    const locationText = formatApartmentLocation(apartment);
    const imageUrl = getImageUrl(apartment.image || apartment.images?.[0] || "");
    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user && onApartmentClick) {
            onApartmentClick(e);
            return;
        }
        toggleFavorite(apartment.id);
    };
    const prices = (apartment.rooms ?? []).map(room => Number(room.price)).filter(price => Number.isFinite(price) && price > 0);
    const priceLabel = prices.length ? `₱${Math.min(...prices).toLocaleString("en-PH")} / month` : "Price unavailable";
    const views = Number(apartment.views ?? apartment.viewCount ?? 0);
    return (<Link className="apartment-card-link" to={`/apartment/${apartment.id}`} state={detailState} onClick={onApartmentClick}>
      <Card className="apartment-card-enter">
        <div className="apartment-card-panel">
          {imageUrl ? <ImageWithFallback src={imageUrl} alt={apartment.title} className="apartment-card-image-with-fallback"/> : <div className="apartment-card-image-unavailable">Image unavailable</div>}
          <div className="apartment-card-overlay"/>
          {showFavoriteButton && (<Button variant="ghost" size="icon" className={`apartment-card-button ${favorite ? "apartment-card-button-2" : ""}`} onClick={handleFavoriteClick} aria-label={favorite ? "Remove from favorites" : "Add to favorites"}>
              <Heart className={`apartment-card-heart-icon ${favorite ? "apartment-card-heart-icon-2" : ""}`} fill="currentColor"/>
            </Button>)}
          <div className="apartment-card-badges-enter">
            <Badge className={`${STATUS_BADGE[apartment.status ?? "available"]} apartment-card-badge-4`}>
              {STATUS_LABEL[apartment.status ?? "available"]}
            </Badge>
          </div>
        </div>
        <CardContent className="apartment-card-card-content">
          <div className="apartment-card-row">
            <h3 className="apartment-card-heading">{apartment.title}</h3>
            <span className="apartment-card-views">{views.toLocaleString()} {views === 1 ? "view" : "views"}</span>
          </div>
          <p className="apartment-card-location">{locationText}</p>
          <ApartmentRatingSummary stats={ratingStats} isLoading={ratingsLoading} compact className="apartment-card-apartment-rating-summary"/>
          <p className="apartment-card-price">{priceLabel}</p>
          <span className="apartment-card-details">View room details</span>
        </CardContent>
      </Card>
    </Link>);
}
