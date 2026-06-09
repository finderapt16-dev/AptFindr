import { Link } from "react-router-dom";
import { Heart, Bed, Bath, Square, MapPin, ShieldCheck, Flag } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Apartment } from "../../data/apartments";
import { getImageUrl } from "../../utils/images";
import { useFavorites } from "../../hooks/useFavorites";
import { User, useAuth } from "../../contexts/AuthContext";

interface ApartmentCardProps {
  apartment: Apartment;
}

const STATUS_BADGE: Record<string, string> = {
  available: "bg-green-600 text-white",
  occupied: "bg-red-600 text-white",
  reserved: "bg-yellow-500 text-white",
  maintenance: "bg-slate-500 text-white",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Under Maintenance",
};

export function ApartmentCard({ apartment }: ApartmentCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const favorite = isFavorite(apartment.id);

  // Check if landlord is verified
  const getLandlordVerification = () => {
    if (!apartment.landlordId) return null;

    const usersStr = localStorage.getItem("users");
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    const landlord = users.find(u => u.id === apartment.landlordId);

    return landlord?.isVerified ? landlord : null;
  };

  const verifiedLandlord = getLandlordVerification();



  // Check for pending reports (admins only)
  const getReportCount = () => {
    if (user?.role !== "admin") return 0;
    try {
      const reports = JSON.parse(localStorage.getItem("apartmentReports") || "[]");
      return reports.filter((r: any) =>
        r.apartmentId === apartment.id && r.status === "pending"
      ).length;
    } catch {
      return 0;
    }
  };

  const reportCount = getReportCount();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(apartment.id);
  };

  return (
    <Link to={`/apartment/${apartment.id}`}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:transform hover:-translate-y-2 border-2 hover:border-amber-200 animate-fade-in">
        <div className="relative aspect-[4/3] overflow-hidden group">
          <img
            src={getImageUrl(apartment.image)}
            alt={apartment.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Button
            variant="ghost"
            size="icon"
            className={`absolute right-2 top-2 rounded-full bg-white/90 backdrop-blur-md hover:bg-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 ${
              favorite ? "text-pink-500" : ""
            }`}
            onClick={handleFavoriteClick}
          >
            <Heart className={`h-5 w-5 ${favorite ? "animate-pulse" : ""}`} fill={favorite ? "currentColor" : "none"} />
          </Button>
          <div className="absolute left-2 top-2 flex flex-col gap-2 animate-slide-in-left">
            {reportCount > 0 && (
              <Badge className="bg-gradient-to-r from-red-500 to-rose-600 flex items-center gap-1 shadow-lg backdrop-blur-sm text-white font-bold">
                <Flag className="h-3 w-3" />
                {reportCount} {reportCount === 1 ? "Report" : "Reports"}
              </Badge>
            )}
            {verifiedLandlord && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 flex items-center gap-1 shadow-lg backdrop-blur-sm">
                <ShieldCheck className="h-3 w-3" />
                Verified Landlord
              </Badge>
            )}
            {apartment.petFriendly && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">Pet Friendly</Badge>
            )}
            <Badge className={`${STATUS_BADGE[apartment.status ?? "available"]} shadow-lg`}>
              {STATUS_LABEL[apartment.status ?? "available"]}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4 bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 text-slate-900 group-hover:text-amber-600 transition-colors">{apartment.title}</h3>
              <div className="flex items-center text-slate-600 text-sm mb-3">
                <MapPin className="h-4 w-4 mr-1 text-amber-500" />
                <span>
                  {apartment.city}, {apartment.state}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">${apartment.price}</p>
              <p className="text-sm text-slate-600">/month</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600 border-t border-amber-100 pt-3 mt-3">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4 text-amber-500" />
              <span>{apartment.bedrooms} bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4 text-purple-500" />
              <span>{apartment.bathrooms} bath</span>
            </div>
            <div className="flex items-center gap-1">
              <Square className="h-4 w-4 text-pink-500" />
              <span>{apartment.sqft} sqft</span>
            </div>
          </div>

        </CardContent>
      </Card>
    </Link>
  );
}

