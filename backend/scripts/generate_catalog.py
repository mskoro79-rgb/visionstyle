"""One-off generator for the built-in fashion catalog (app/data/catalog.json).

Run with: python -m scripts.generate_catalog
Produces a structured, varied catalog covering every category, gender,
style, occasion, season and budget tier so the recommendation engine has
real signal to filter/rank against. Uses Unsplash "source" style deterministic
placeholder images (picsum with seed) so every SKU has a stable image URL
without needing binary assets in the repo.
"""
import json
from pathlib import Path

CATEGORIES = {
    "shirts": {"names": ["Oxford Shirt", "Linen Shirt", "Flannel Shirt", "Poplin Shirt", "Denim Shirt"]},
    "tshirts": {"names": ["Crew Neck Tee", "V-Neck Tee", "Henley Tee", "Graphic Tee", "Ribbed Tee"]},
    "pants": {"names": ["Tailored Trousers", "Chino Pants", "Wide-Leg Pants", "Cargo Pants", "Pleated Trousers"]},
    "jeans": {"names": ["Slim Fit Jeans", "Straight Fit Jeans", "Bootcut Jeans", "Skinny Jeans", "Relaxed Jeans"]},
    "jackets": {"names": ["Bomber Jacket", "Blazer", "Denim Jacket", "Leather Jacket", "Trench Coat"]},
    "shoes": {"names": ["Chelsea Boots", "Sneakers", "Oxford Shoes", "Loafers", "Ankle Boots"]},
    "watches": {"names": ["Minimalist Watch", "Chronograph Watch", "Dress Watch", "Sport Watch", "Smart Watch"]},
    "belts": {"names": ["Leather Belt", "Reversible Belt", "Woven Belt", "Canvas Belt", "Chain Belt"]},
}

COLORS = ["Black", "Navy", "Emerald", "Crimson", "Gold", "Charcoal", "Ivory", "Burgundy", "Olive", "Purple"]
GENDERS = ["male", "female", "unisex"]
STYLES = ["minimalist", "streetwear", "classic", "bohemian", "edgy", "romantic", "sporty", "glamorous"]
OCCASIONS = ["casual", "formal", "business", "party", "wedding", "date_night", "sport", "travel"]
SEASONS = ["spring", "summer", "autumn", "winter"]
BUDGETS = ["budget", "mid_range", "premium", "luxury"]
FACE_SHAPES = ["oval", "round", "square", "heart", "diamond", "oblong", "triangle"]
BODY_SHAPES = ["rectangle", "hourglass", "pear", "inverted_triangle", "apple", "trapezoid"]

BRANDS_BY_TIER = {
    "budget": ["Uniform Basics", "StreetLine", "CoreWear"],
    "mid_range": ["Meridian & Co.", "Atlas Studio", "Norvell"],
    "premium": ["Ferro Milano", "Aurelio", "Blackwood & Vane"],
    "luxury": ["Casa Lorenzo", "Maison Vireux", "Obsidian House"],
}

PRICE_RANGES = {
    "budget": (15, 45),
    "mid_range": (45, 120),
    "premium": (120, 350),
    "luxury": (350, 1200),
}


def cyclic(lst, i):
    return lst[i % len(lst)]


def build_catalog():
    items = []
    sku_counter = 1
    for category, meta in CATEGORIES.items():
        for name_idx, base_name in enumerate(meta["names"]):
            for variant in range(3):  # 3 color/tier variants per product name
                idx = sku_counter
                budget = cyclic(BUDGETS, name_idx + variant)
                gender = cyclic(GENDERS, name_idx + variant)
                color = cyclic(COLORS, idx)
                brand = cyclic(BRANDS_BY_TIER[budget], variant)
                low, high = PRICE_RANGES[budget]
                price = round(low + (high - low) * ((idx * 37) % 100) / 100, 2)

                styles = [cyclic(STYLES, idx), cyclic(STYLES, idx + 3)]
                occasions = [cyclic(OCCASIONS, idx), cyclic(OCCASIONS, idx + 2)]
                seasons = [cyclic(SEASONS, idx), cyclic(SEASONS, idx + 1)]
                face_fit = [cyclic(FACE_SHAPES, idx), cyclic(FACE_SHAPES, idx + 4)]
                body_fit = [cyclic(BODY_SHAPES, idx), cyclic(BODY_SHAPES, idx + 2)]

                sku = f"VS-{category[:3].upper()}-{idx:04d}"
                seed = f"visionstyle-{category}-{idx}"

                items.append(
                    {
                        "sku": sku,
                        "category": category,
                        "name": f"{color} {base_name}",
                        "brand": brand,
                        "price": price,
                        "currency": "USD",
                        "colors": [color, cyclic(COLORS, idx + 5)],
                        "image_url": f"https://picsum.photos/seed/{seed}/600/800",
                        "gender": gender,
                        "styles": list(dict.fromkeys(styles)),
                        "occasions": list(dict.fromkeys(occasions)),
                        "seasons": list(dict.fromkeys(seasons)),
                        "budget_tier": budget,
                        "face_shape_fit": list(dict.fromkeys(face_fit)),
                        "body_shape_fit": list(dict.fromkeys(body_fit)),
                        "active": True,
                    }
                )
                sku_counter += 1
    return items


if __name__ == "__main__":
    catalog = build_catalog()
    out_path = Path(__file__).resolve().parent.parent / "app" / "data" / "catalog.json"
    out_path.write_text(json.dumps(catalog, indent=2))
    print(f"Wrote {len(catalog)} catalog items to {out_path}")
