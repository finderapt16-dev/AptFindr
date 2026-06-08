import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "./ui/sheet";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  bedrooms: string;
  setBedrooms: (bedrooms: string) => void;
  petFriendly: boolean;
  setPetFriendly: (petFriendly: boolean) => void;
  parking: boolean;
  setParking: (parking: boolean) => void;
  furnished?: boolean;
  setFurnished?: (furnished: boolean) => void;
}

export function FilterBar({
  searchQuery,
  setSearchQuery,
  priceRange,
  setPriceRange,
  bedrooms,
  setBedrooms,
  petFriendly,
  setPetFriendly,
  parking,
  setParking,
  furnished,
  setFurnished,
}: FilterBarProps) {
  return (
    <div className="bg-white border-b py-4">
      <div className="container mx-auto px-4">
        <div className="flex gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by city, neighborhood, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters - Desktop */}
          <div className="hidden lg:flex gap-2">
            <Select value={bedrooms} onValueChange={setBedrooms}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Bedrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any beds</SelectItem>
                <SelectItem value="1">1+ beds</SelectItem>
                <SelectItem value="2">2+ beds</SelectItem>
                <SelectItem value="3">3+ beds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* More Filters - Mobile & Desktop */}
          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900 h-9 px-4 py-2">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Apartments</SheetTitle>
                <SheetDescription>Refine your apartment search with filters</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                {/* Price Range */}
                <div className="space-y-3">
                  <Label>Price Range</Label>
                  <div className="text-sm text-slate-600">
                    ${priceRange[0]} - ${priceRange[1]}
                  </div>
                  <Slider
                    min={1000}
                    max={6000}
                    step={100}
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                  />
                </div>

                {/* Bedrooms */}
                <div className="space-y-3">
                  <Label>Bedrooms</Label>
                  <Select value={bedrooms} onValueChange={setBedrooms}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amenities */}
                <div className="space-y-3">
                  <Label>Amenities</Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pet Friendly</span>
                    <Switch checked={petFriendly} onCheckedChange={setPetFriendly} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Parking</span>
                    <Switch checked={parking} onCheckedChange={setParking} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fully Furnished</span>
                    <Switch checked={furnished || false} onCheckedChange={(value) => setFurnished?.(value)} />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
