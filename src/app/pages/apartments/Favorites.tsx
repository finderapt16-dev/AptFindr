import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { listFavoriteApartments } from "@/app/data/apartments";
import { useFavorites } from "@/app/hooks/useFavorites";
import { ApartmentCard } from "@/app/components/common/ApartmentCard";
import { Heart } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";

export function Favorites() {
  const { user } = useAuth();
  const { refreshFavorites } = useFavorites();
  const [favoriteApartments, setFavoriteApartments] = useState<Awaited<ReturnType<typeof listFavoriteApartments>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.id) {
        setFavoriteApartments([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const apartments = await listFavoriteApartments(user.id);
        if (active) {
          setFavoriteApartments(apartments.filter((apt) => apt.isPublished !== false));
        }
      } catch (error) {
        console.error("Failed to load favorite apartments:", error);
        if (active) {
          setFavoriteApartments([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();
    void refreshFavorites();

    return () => {
      active = false;
    };
  }, [user?.id, refreshFavorites]);

  if (user?.role === "landlord" || user?.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Favorites</h1>
          <p className="text-slate-600">
            {favoriteApartments.length} saved {favoriteApartments.length === 1 ? "apartment" : "apartments"}
          </p>
        </div>

        {isLoading ? (
          <p className="text-center text-slate-500 py-12">Loading favorites...</p>
        ) : favoriteApartments.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-lg text-slate-600 mb-2">No favorites yet</p>
            <p className="text-sm text-slate-500">Start browsing apartments and save your favorites here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteApartments.map((apartment) => (
              <ApartmentCard key={apartment.id} apartment={apartment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
