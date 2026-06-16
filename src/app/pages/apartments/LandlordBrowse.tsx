import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  LayoutGrid,
  Map,
  ArrowLeft,
  Search,
  TrendingUp,
  Eye,
  Heart,
  Home,
  DollarSign,
  MapPin,
  ShieldCheck,
  Users,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Apartment } from "@/app/data/apartments";
import { getImageUrl } from "@/app/utils/images";
import { User } from "@/app/contexts/AuthContext";

export function LandlordBrowse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { apartments: allApartments, isLoading: apartmentsLoading } = useApartmentsContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([1000, 6000]);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filter for only published apartments for market insights
  const publishedApartments = useMemo(
    () => allApartments.filter((apt) => apt.isPublished !== false),
    [allApartments]
  );

  // Calculate market insights
  const marketInsights = useMemo(() => {
    if (publishedApartments.length === 0) {
      return {
        totalListings: 0,
        averageRent: 0,
        mostViewedProperties: [],
        recentlyAddedCount: 0,
        uniqueCities: 0,
      };
    }

    const totalListings = publishedApartments.length;
    const averageRent = Math.round(
      publishedApartments.reduce((sum, apt) => sum + apt.price, 0) / publishedApartments.length
    );

    // Get apartment views from localStorage
    const getViewCount = (id: string) => {
      try {
        const views = JSON.parse(localStorage.getItem("apartmentViews") || "[]");
        return views.filter((v: any) => v.apartmentId === id).length || 0;
      } catch {
        return 0;
      }
    };

    const mostViewedProperties = [...publishedApartments]
      .sort((a, b) => getViewCount(b.id) - getViewCount(a.id))
      .slice(0, 3);

    // Recently added (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyAddedCount = publishedApartments.filter(
      (apt) => new Date(apt.createdAt ?? apt.availableDate) > sevenDaysAgo
    ).length;

    const uniqueCities = new Set(publishedApartments.map((apt) => apt.city)).size;

    return {
      totalListings,
      averageRent,
      mostViewedProperties,
      recentlyAddedCount,
      uniqueCities,
    };
  }, [publishedApartments]);

  // Filter and sort apartments
  const filteredApartments = useMemo(() => {
    let filtered = publishedApartments;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.title.toLowerCase().includes(query) ||
          apt.city.toLowerCase().includes(query) ||
          apt.address.toLowerCase().includes(query)
      );
    }

    // Location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter((apt) => apt.city === locationFilter);
    }

    // Price range filter
    filtered = filtered.filter((apt) => apt.price >= priceRange[0] && apt.price <= priceRange[1]);

    // Property type filter
    if (propertyTypeFilter !== "all") {
      filtered = filtered.filter((apt) => apt.propertyType === propertyTypeFilter);
    }

    // Sort
    const sorted = [...filtered];
    if (sortBy === "most_viewed") {
      const getViewCount = (id: string) => {
        try {
          const views = JSON.parse(localStorage.getItem("apartmentViews") || "[]");
          return views.filter((v: any) => v.apartmentId === id).length || 0;
        } catch {
          return 0;
        }
      };
      sorted.sort((a, b) => getViewCount(b.id) - getViewCount(a.id));
    } else if (sortBy === "most_favorited") {
      const getFavCount = (id: string) => {
        try {
          const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
          return favs.filter((f: any) => f.apartmentId === id).length || 0;
        } catch {
          return 0;
        }
      };
      sorted.sort((a, b) => getFavCount(b.id) - getFavCount(a.id));
    } else if (sortBy === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt ?? b.availableDate).getTime() -
          new Date(a.createdAt ?? a.availableDate).getTime()
      );
    } else if (sortBy === "price_low") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_high") {
      sorted.sort((a, b) => b.price - a.price);
    }

    return sorted;
  }, [publishedApartments, searchQuery, locationFilter, priceRange, propertyTypeFilter, sortBy]);

  // Get unique cities for filter
  const uniqueCities = useMemo(
    () => Array.from(new Set(publishedApartments.map((apt) => apt.city))).sort(),
    [publishedApartments]
  );

  // Get landlord info for verification badge
  const getLandlordInfo = (landlordId: string) => {
    try {
      const users: User[] = JSON.parse(localStorage.getItem("users") || "[]");
      return users.find((u) => u.id === landlordId);
    } catch {
      return null;
    }
  };

  // Get view and favorite counts
  const getViewCount = (id: string) => {
    try {
      const views = JSON.parse(localStorage.getItem("apartmentViews") || "[]");
      return views.filter((v: any) => v.apartmentId === id).length || 0;
    } catch {
      return 0;
    }
  };

  const getFavCount = (id: string) => {
    try {
      const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
      return favs.filter((f: any) => f.apartmentId === id).length || 0;
    } catch {
      return 0;
    }
  };

  const STATUS_BADGE: Record<string, string> = {
    available: "bg-green-100 text-green-700",
    occupied: "bg-red-100 text-red-700",
    reserved: "bg-yellow-100 text-yellow-700",
    maintenance: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Header */}
      <div className="border-b border-amber-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-slate-600 hover:text-amber-600 hover:bg-amber-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Market Overview
              </h1>
              <p className="text-sm text-slate-500">Browse all available properties and market trends</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Market Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Listings Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium mb-1">Total Listings</p>
                  <p className="text-3xl font-bold text-amber-600">{marketInsights.totalListings}</p>
                  <p className="text-xs text-slate-400 mt-2">Published apartments available</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Home className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Rent Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium mb-1">Average Rent</p>
                  <p className="text-3xl font-bold text-amber-600">₱{marketInsights.averageRent.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-2">Per month in La Paz</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recently Added Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium mb-1">Recently Added</p>
                  <p className="text-3xl font-bold text-orange-700">{marketInsights.recentlyAddedCount}</p>
                  <p className="text-xs text-slate-400 mt-2">Added last 7 days</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coverage Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium mb-1">Coverage</p>
                  <p className="text-3xl font-bold text-orange-600">{marketInsights.uniqueCities}</p>
                  <p className="text-xs text-slate-400 mt-2">Different cities</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Most Viewed Properties */}
        {marketInsights.mostViewedProperties.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-600" />
              Top Performing Properties
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {marketInsights.mostViewedProperties.map((apt) => (
                <Card key={apt.id} className="border-0 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                  <div className="relative aspect-video overflow-hidden bg-slate-200">
                    <img
                      src={getImageUrl(apt.image)}
                      alt={apt.title}
                      className="h-full w-full object-cover hover:scale-105 transition-transform"
                    />
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-white">
                      {getViewCount(apt.id)} views
                    </Badge>
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-slate-900 mb-1">{apt.title}</h3>
                    <p className="text-sm text-slate-500 mb-3">{apt.address}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold text-amber-600">₱{apt.price.toLocaleString()}</p>
                      <Badge variant="outline">{apt.bedrooms} bed</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200 p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase mb-2 block">
                Search Properties
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase mb-2 block">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:border-amber-400 focus:ring-amber-400 bg-white"
              >
                <option value="all">All Cities</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase mb-2 block">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                  placeholder="Min"
                  className="w-1/2 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:border-amber-400 focus:ring-amber-400"
                />
                <input
                  type="number"
                  min="0"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 9999999])}
                  placeholder="Max"
                  className="w-1/2 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:border-amber-400 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase mb-2 block">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:border-amber-400 focus:ring-amber-400 bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="most_viewed">Most Viewed</option>
                <option value="most_favorited">Most Favorited</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Available Properties ({filteredApartments.length})
          </h2>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={
                viewMode === "grid"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "border-amber-200 text-slate-600 hover:bg-amber-50"
              }
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={
                viewMode === "table"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "border-amber-200 text-slate-600 hover:bg-amber-50"
              }
            >
              <Filter className="h-4 w-4 mr-2" />
              Table
            </Button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApartments.length > 0 ? (
              filteredApartments.map((apartment) => {
                const landlord = apartment.landlordId ? getLandlordInfo(apartment.landlordId) : null;
                const viewCount = getViewCount(apartment.id);
                const favCount = getFavCount(apartment.id);

                return (
                  <Card
                    key={apartment.id}
                    className="border-0 shadow-sm hover:shadow-lg transition-all overflow-hidden cursor-pointer group"
                    onClick={() => navigate(`/apartment/${apartment.id}`)}
                  >
                    {/* Image */}
                    <div className="relative aspect-video overflow-hidden bg-slate-200">
                      <img
                        src={getImageUrl(apartment.image)}
                        alt={apartment.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Status Badge */}
                      <Badge className={`absolute top-3 left-3 ${STATUS_BADGE[apartment.status ?? "available"] || STATUS_BADGE.available} border-0`}>
                        {apartment.status === "maintenance"
                          ? "Under Maintenance"
                          : apartment.status === "occupied"
                            ? "Occupied"
                            : apartment.status === "reserved"
                              ? "Reserved"
                              : "Available"}
                      </Badge>

                      {/* View and Favorite Counts */}
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <Badge className="bg-white/90 text-slate-700 hover:bg-white flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {viewCount}
                        </Badge>
                        <Badge className="bg-white/90 text-slate-700 hover:bg-white flex items-center gap-1">
                          <Heart className="h-3 w-3 text-pink-500" />
                          {favCount}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="pt-4">
                      {/* Title and Landlord */}
                      <div className="mb-3">
                        <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-amber-600 transition-colors">
                          {apartment.title}
                        </h3>
                        {landlord && (
                          <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
                            {landlord.isVerified && (
                              <>
                                <ShieldCheck className="h-3 w-3 text-amber-600" />
                                <span className="font-medium">Verified Landlord</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-sm text-slate-600 mb-4">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>
                          {apartment.city}, {apartment.state}
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-t border-slate-100">
                        <div className="text-center pt-3">
                          <p className="text-xs text-slate-500 mb-1">Monthly</p>
                          <p className="text-lg font-bold text-amber-600">
                            ₱{apartment.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center pt-3">
                          <p className="text-xs text-slate-500 mb-1">Available</p>
                          <p className="text-lg font-bold text-green-600">{apartment.bedrooms}</p>
                        </div>
                        <div className="text-center pt-3">
                          <p className="text-xs text-slate-500 mb-1">Total</p>
                          <p className="text-lg font-bold text-slate-900">{apartment.bedrooms}</p>
                        </div>
                      </div>

                      {/* Area */}
                      <div className="text-xs text-slate-600 pb-3 border-b border-slate-100">
                        <span className="font-medium">{apartment.sqft}</span> sqft • <span className="font-medium">{apartment.bathrooms}</span> bath
                      </div>

                      {/* View Details Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/apartment/${apartment.id}`);
                        }}
                        className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg font-semibold"
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="inline-flex h-16 w-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                  <Home className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Properties Found</h3>
                <p className="text-slate-600 mb-6">
                  Try adjusting your search filters to find properties in your market
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setLocationFilter("all");
                    setPriceRange([1000, 6000]);
                    setPropertyTypeFilter("all");
                  }}
                  variant="outline"
                  className="border-amber-200 text-slate-600 hover:bg-amber-50"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white/80 backdrop-blur-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Location</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Rent</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase">Rooms</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase">Views</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase">Saved</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApartments.length > 0 ? (
                  filteredApartments.map((apartment) => {
                    const landlord = apartment.landlordId ? getLandlordInfo(apartment.landlordId) : null;
                    const viewCount = getViewCount(apartment.id);
                    const favCount = getFavCount(apartment.id);

                    return (
                      <tr
                        key={apartment.id}
                        className="border-b border-amber-100 hover:bg-amber-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getImageUrl(apartment.image)}
                              alt={apartment.title}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-semibold text-slate-900">{apartment.title}</p>
                              {landlord?.isVerified && (
                                <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  Verified
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {apartment.city}, {apartment.state}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-bold text-amber-600">₱{apartment.price.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600">
                          {apartment.bedrooms} bed
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="text-slate-600 border-slate-200">
                            {viewCount}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="text-pink-600 border-pink-200">
                            {favCount}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge className={STATUS_BADGE[apartment.status ?? "available"] || STATUS_BADGE.available}>
                            {apartment.status === "maintenance"
                              ? "Maintenance"
                              : apartment.status === "occupied"
                                ? "Occupied"
                                : apartment.status === "reserved"
                                  ? "Reserved"
                                  : "Available"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            onClick={() => navigate(`/apartment/${apartment.id}`)}
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <p className="text-slate-600">No properties match your criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
