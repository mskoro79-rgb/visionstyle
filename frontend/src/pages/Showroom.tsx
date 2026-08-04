import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import Loader from "@/components/ui/Loader";
import SectionHeading from "@/components/ui/SectionHeading";
import { listCatalog, listCategories } from "@/services/api";
import type { CatalogItem } from "@/types";

export default function Showroom() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cats, catalogItems] = await Promise.all([
        listCategories(),
        listCatalog(activeCategory === "all" ? undefined : { category: activeCategory }),
      ]);
      setCategories(cats);
      setItems(catalogItems);
      setLoading(false);
    })();
  }, [activeCategory]);

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Phase 6 · Built-in Catalog"
        title="The VisionStyle Showroom"
        subtitle="A curated, filterable catalog spanning shirts, denim, outerwear, footwear and accessories — ready to power the recommendation engine."
      />

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 rounded-full text-sm capitalize border transition-all ${
            activeCategory === "all"
              ? "bg-gradient-to-r from-royal-600 to-crimson-500 border-transparent text-white"
              : "border-white/15 text-white/60 hover:text-white"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm capitalize border transition-all ${
              activeCategory === cat
                ? "bg-gradient-to-r from-royal-600 to-crimson-500 border-transparent text-white"
                : "border-white/15 text-white/60 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-10">
        {loading ? (
          <Loader label="Loading catalog..." />
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
                <GlassCard hoverable className="p-0 overflow-hidden h-full flex flex-col">
                  <img src={item.image_url} alt={item.name} className="h-48 w-full object-cover" loading="lazy" />
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-xs text-white/40 uppercase tracking-wide">{item.brand}</p>
                    <h4 className="font-semibold text-white mt-1">{item.name}</h4>
                    <p className="text-gilt-400 font-bold mt-2">${item.price.toFixed(2)}</p>
                    <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                      <Badge color="royal" className="!px-2 !py-0.5 !text-[10px]">
                        {item.budget_tier.replace("_", " ")}
                      </Badge>
                      <Badge color="jade" className="!px-2 !py-0.5 !text-[10px] capitalize">
                        {item.gender}
                      </Badge>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
