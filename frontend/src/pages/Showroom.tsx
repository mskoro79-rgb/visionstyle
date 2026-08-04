import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, X, Sparkles, Clock } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import SectionHeading from "@/components/ui/SectionHeading";
import { useDebounce } from "@/hooks/useDebounce";
import { useCachedFetch } from "@/hooks/useCachedFetch";
import { useSession } from "@/context/SessionContext";
import {
  getNearestMatches,
  getShowroomInventoryStats,
  listBrands,
  listCategories,
  listRackLocations,
  searchCatalog,
} from "@/services/api";
import type { CatalogItem } from "@/types";

export default function Showroom() {
  const { recentlyViewed, addRecentlyViewed } = useSession();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeBrand, setActiveBrand] = useState<string>("");
  const [activeRack, setActiveRack] = useState<string>("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [nearestMatches, setNearestMatches] = useState<CatalogItem[]>([]);

  const debouncedQuery = useDebounce(query, 300);

  const { data: categories } = useCachedFetch("catalog:categories", listCategories, { ttlMs: 5 * 60_000 });
  const { data: brands } = useCachedFetch("catalog:brands", listBrands, { ttlMs: 5 * 60_000 });
  const { data: rackLocations } = useCachedFetch("catalog:racks", listRackLocations, { ttlMs: 5 * 60_000 });
  const { data: stats } = useCachedFetch("catalog:inventory-stats", getShowroomInventoryStats, { ttlMs: 60_000 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const results = await searchCatalog({
        q: debouncedQuery || undefined,
        category: activeCategory || undefined,
        brand: activeBrand || undefined,
        rack_number: activeRack || undefined,
        available_only: availableOnly || undefined,
      });
      setItems(results);
      setLoading(false);
    })();
  }, [debouncedQuery, activeCategory, activeBrand, activeRack, availableOnly]);

  const openDetail = async (item: CatalogItem) => {
    setSelectedItem(item);
    addRecentlyViewed(item);
    const matches = await getNearestMatches(item.sku, 6);
    setNearestMatches(matches);
  };

  const activeFilterCount = [activeCategory, activeBrand, activeRack, availableOnly ? "y" : ""].filter(Boolean).length;

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Phase 9 · Smart Showroom"
        title="The VisionStyle Showroom"
        subtitle="Search and filter the combined catalog — preloaded pieces plus everything the owner has added to live inventory."
      />

      {stats && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Live Inventory Items", value: stats.total_items },
            { label: "Available Now", value: stats.available_items },
            { label: "Out of Stock", value: stats.out_of_stock_items },
            { label: "Total Units on Rack", value: stats.total_stock_units },
          ].map((s) => (
            <GlassCard key={s.label} className="text-center py-4">
              <p className="text-xl font-bold gradient-text-royal">{s.value}</p>
              <p className="text-[11px] text-white/50 mt-1">{s.label}</p>
            </GlassCard>
          ))}
        </div>
      )}

      <div className="mt-10 space-y-4">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or brand..."
            className="w-full input pl-11"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <FilterChip active={!activeCategory} label="All Categories" onClick={() => setActiveCategory("")} />
          {categories?.map((cat) => (
            <FilterChip key={cat} active={activeCategory === cat} label={cat} onClick={() => setActiveCategory(cat)} />
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <select className="input !w-auto !h-9 text-sm" value={activeBrand} onChange={(e) => setActiveBrand(e.target.value)}>
            <option value="">All Brands</option>
            {brands?.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select className="input !w-auto !h-9 text-sm" value={activeRack} onChange={(e) => setActiveRack(e.target.value)}>
            <option value="">All Rack Locations</option>
            {rackLocations?.map((r) => (
              <option key={r} value={r}>Rack {r}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-white/60 px-3">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
            Available only
          </label>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setActiveCategory(""); setActiveBrand(""); setActiveRack(""); setAvailableOnly(false); }}
              className="text-xs text-crimson-400 flex items-center gap-1 px-3"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {recentlyViewed.length > 0 && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-wide text-white/40 mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Recently Viewed (this session)
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyViewed.map((item) => (
              <button key={item.sku} onClick={() => openDetail(item)} className="flex-shrink-0">
                <img src={item.image_url} alt={item.name} loading="lazy" className="h-16 w-16 rounded-lg object-cover border border-white/10 hover:border-gilt-400/60 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        {loading ? (
          <CardGridSkeleton count={8} />
        ) : items.length === 0 ? (
          <GlassCard className="text-center py-16">
            <Search className="h-10 w-10 mx-auto text-white/20 mb-4" />
            <p className="text-white/50">No products match your search and filters.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item, i) => (
              <motion.div
                key={item.sku}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 8) * 0.04 }}
              >
                <GlassCard hoverable className="p-0 overflow-hidden h-full flex flex-col" onClick={() => openDetail(item)}>
                  <img src={item.image_url} alt={item.name} className="h-48 w-full object-cover" loading="lazy" decoding="async" />
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-xs text-white/40 uppercase tracking-wide">{item.brand}</p>
                    <h4 className="font-semibold text-white mt-1">{item.name}</h4>
                    <p className="text-gilt-400 font-bold mt-2">${item.price.toFixed(2)}</p>
                    <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                      <Badge color="royal" className="!px-2 !py-0.5 !text-[10px]">
                        {item.budget_tier.replace("_", " ")}
                      </Badge>
                      {item.rack_number && (
                        <Badge color="gilt" className="!px-2 !py-0.5 !text-[10px] flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5" /> {item.rack_number}
                        </Badge>
                      )}
                      {item.source === "inventory" && (
                        <Badge color={item.available && item.stock_quantity > 0 ? "jade" : "crimson"} className="!px-2 !py-0.5 !text-[10px]">
                          {item.available && item.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-6"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl p-6 max-w-3xl w-full mt-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end mb-2">
                <button onClick={() => setSelectedItem(null)} className="text-white/50 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <img src={selectedItem.image_url} alt={selectedItem.name} loading="lazy" decoding="async" className="rounded-xl w-full object-cover max-h-96" />
                <div>
                  <p className="text-xs text-white/40 uppercase">{selectedItem.brand}</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{selectedItem.name}</h3>
                  <p className="text-gilt-400 text-xl font-bold mt-2">${selectedItem.price.toFixed(2)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Badge color="royal" className="capitalize">{selectedItem.category}</Badge>
                    {selectedItem.rack_number && <Badge color="gilt">Rack {selectedItem.rack_number}</Badge>}
                    {selectedItem.sizes.length > 0 && <Badge color="jade">{selectedItem.sizes.join(", ")}</Badge>}
                  </div>
                  {selectedItem.colors.length > 0 && (
                    <p className="text-sm text-white/50 mt-4">Colors: {selectedItem.colors.join(", ")}</p>
                  )}
                </div>
              </div>

              {nearestMatches.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-wide text-white/40 mb-3 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Nearest Matching Products
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {nearestMatches.map((match) => (
                      <button key={match.sku} onClick={() => openDetail(match)} className="text-left">
                        <img src={match.image_url} alt={match.name} loading="lazy" className="h-20 w-full object-cover rounded-lg" />
                        <p className="text-[10px] text-white/50 mt-1 truncate">{match.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm capitalize border transition-all ${
        active
          ? "bg-gradient-to-r from-royal-600 to-crimson-500 border-transparent text-white"
          : "border-white/15 text-white/60 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
