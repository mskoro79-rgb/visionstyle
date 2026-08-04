import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, LogOut, Package, ImagePlus, X, Save } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import SectionHeading from "@/components/ui/SectionHeading";
import Loader from "@/components/ui/Loader";
import { useOwner } from "@/context/OwnerContext";
import {
  createInventoryItem,
  deleteInventoryItem,
  listInventory,
  updateInventoryItem,
  uploadInventoryImages,
} from "@/services/api";
import { invalidateCache } from "@/hooks/useCachedFetch";
import type { BudgetTier, CatalogItem, Gender, InventoryItemCreate } from "@/types";

const CATEGORIES = ["shirts", "tshirts", "pants", "jeans", "jackets", "shoes", "watches", "belts"];
const GENDERS: Gender[] = ["male", "female", "unisex"];
const BUDGETS: BudgetTier[] = ["budget", "mid_range", "premium", "luxury"];

const emptyForm: InventoryItemCreate = {
  category: "shirts",
  name: "",
  brand: "",
  price: 0,
  currency: "USD",
  colors: [],
  gender: "unisex",
  styles: [],
  occasions: [],
  seasons: [],
  budget_tier: "mid_range",
  face_shape_fit: [],
  body_shape_fit: [],
  rack_number: "",
  sizes: [],
  stock_quantity: 0,
  available: true,
};

export default function OwnerDashboard() {
  const { owner, logout } = useOwner();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryItemCreate>(emptyForm);
  const [colorsInput, setColorsInput] = useState("");
  const [sizesInput, setSizesInput] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await listInventory();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openCreateForm = () => {
    setEditingSku(null);
    setForm(emptyForm);
    setColorsInput("");
    setSizesInput("");
    setImages([]);
    setError(null);
    setFormOpen(true);
  };

  const openEditForm = (item: CatalogItem) => {
    setEditingSku(item.sku);
    setForm({
      category: item.category,
      name: item.name,
      brand: item.brand ?? "",
      price: item.price,
      currency: item.currency,
      colors: item.colors,
      gender: item.gender,
      styles: item.styles,
      occasions: item.occasions,
      seasons: item.seasons,
      budget_tier: item.budget_tier,
      face_shape_fit: item.face_shape_fit,
      body_shape_fit: item.body_shape_fit,
      rack_number: item.rack_number ?? "",
      sizes: item.sizes,
      stock_quantity: item.stock_quantity,
      available: item.available,
    });
    setColorsInput(item.colors.join(", "));
    setSizesInput(item.sizes.join(", "));
    setImages([]);
    setError(null);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: InventoryItemCreate = {
        ...form,
        colors: colorsInput.split(",").map((c) => c.trim()).filter(Boolean),
        sizes: sizesInput.split(",").map((s) => s.trim()).filter(Boolean),
      };

      if (editingSku) {
        await updateInventoryItem(editingSku, payload);
        if (images.length > 0) await uploadInventoryImages(editingSku, images);
      } else {
        await createInventoryItem(payload, images);
      }
      invalidateCache("catalog");
      setFormOpen(false);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sku: string) => {
    if (!confirm("Remove this product from inventory? This cannot be undone.")) return;
    await deleteInventoryItem(sku);
    invalidateCache("catalog");
    await loadItems();
  };

  const stats = {
    total: items.length,
    active: items.filter((i) => i.active).length,
    available: items.filter((i) => i.available && i.stock_quantity > 0).length,
    outOfStock: items.filter((i) => i.stock_quantity <= 0).length,
    totalUnits: items.reduce((sum, i) => sum + i.stock_quantity, 0),
  };

  return (
    <PageShell>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
        <SectionHeading
          align="left"
          eyebrow="Phase 8 · Owner Portal"
          title="Inventory Management"
          subtitle={`Signed in as ${owner?.email}`}
          className="mx-0"
        />
        <div className="flex gap-3">
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
          <Button variant="ghost" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
        {[
          { label: "Total Products", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Available", value: stats.available },
          { label: "Out of Stock", value: stats.outOfStock },
          { label: "Total Units", value: stats.totalUnits },
        ].map((stat) => (
          <GlassCard key={stat.label} className="text-center py-6">
            <p className="text-2xl font-bold gradient-text-royal">{stat.value}</p>
            <p className="text-xs text-white/50 mt-1">{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-10"
          >
            <GlassCard glow="gilt">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">{editingSku ? "Edit Product" : "Add Product"}</h3>
                <button onClick={() => setFormOpen(false)} className="text-white/50 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Product Name">
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Brand">
                  <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                </Field>
                <Field label="Category">
                  <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Price (USD)">
                  <input type="number" step="0.01" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                </Field>
                <Field label="Rack Number">
                  <input className="input" value={form.rack_number} onChange={(e) => setForm({ ...form, rack_number: e.target.value })} placeholder="e.g. A3" />
                </Field>
                <Field label="Stock Quantity">
                  <input type="number" className="input" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: parseInt(e.target.value) || 0 })} />
                </Field>
                <Field label="Gender">
                  <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Budget Tier">
                  <select className="input" value={form.budget_tier} onChange={(e) => setForm({ ...form, budget_tier: e.target.value as BudgetTier })}>
                    {BUDGETS.map((b) => (
                      <option key={b} value={b}>{b.replace("_", " ")}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Availability">
                  <label className="flex items-center gap-2 h-10 text-white/70 text-sm">
                    <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                    In stock &amp; available for sale
                  </label>
                </Field>
                <Field label="Colors (comma-separated)">
                  <input className="input" value={colorsInput} onChange={(e) => setColorsInput(e.target.value)} placeholder="Black, Navy" />
                </Field>
                <Field label="Sizes (comma-separated)">
                  <input className="input" value={sizesInput} onChange={(e) => setSizesInput(e.target.value)} placeholder="S, M, L, XL" />
                </Field>
                <Field label="Product Images">
                  <label className="input flex items-center gap-2 cursor-pointer text-white/50">
                    <ImagePlus className="h-4 w-4" />
                    {images.length > 0 ? `${images.length} file(s) selected` : "Choose images"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => setImages(Array.from(e.target.files ?? []))}
                    />
                  </label>
                </Field>
              </div>

              {error && <p className="text-crimson-400 text-sm mt-4">{error}</p>}

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={saving || !form.name || form.price <= 0}>
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : editingSku ? "Update Product" : "Create Product"}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <Loader label="Loading inventory..." />
      ) : items.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Package className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <p className="text-white/50">No products yet. Add your first product to the showroom inventory.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <GlassCard key={item.sku} className="p-0 overflow-hidden flex flex-col">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-40 w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-40 w-full bg-white/5 flex items-center justify-center text-white/20">
                  <Package className="h-10 w-10" />
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-white/40">{item.sku}</p>
                    <h4 className="font-semibold text-white">{item.name}</h4>
                  </div>
                  <p className="text-gilt-400 font-bold">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge color="royal" className="!px-2 !py-0.5 !text-[10px] capitalize">{item.category}</Badge>
                  {item.rack_number && <Badge color="gilt" className="!px-2 !py-0.5 !text-[10px]">Rack {item.rack_number}</Badge>}
                  <Badge color={item.available && item.stock_quantity > 0 ? "jade" : "crimson"} className="!px-2 !py-0.5 !text-[10px]">
                    {item.available && item.stock_quantity > 0 ? `${item.stock_quantity} in stock` : "Out of stock"}
                  </Badge>
                </div>
                <div className="mt-auto pt-4 flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEditForm(item)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.sku)}>
                    <Trash2 className="h-3.5 w-3.5 text-crimson-400" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-white/40 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
