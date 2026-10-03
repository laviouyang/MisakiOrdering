"""Load Misaki's published menu while preserving its source wording."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


MENU_PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "misaki-menu.json"

NAME_FIXUPS = {
    "unagi sauce2oz": "Unagi Sauce (2 oz)",
    "spicy mayonnaise2oz": "Spicy Mayonnaise (2 oz)",
    "teriyaki sauce2oz": "Teriyaki Sauce (2 oz)",
    "ponzu sauce2oz": "Ponzu Sauce (2 oz)",
    "ginger2oz": "Ginger (2 oz)",
    "wasabi2oz": "Wasabi (2 oz)",
    "spicy siracha": "Spicy Sriracha",
    "st. pellegrino500ml": "San Pellegrino (500 mL)",
    "kanpa hama trio": "Kampachi Hama Trio",
    "maguro tataki* app. (seared tuna)": "Maguro Tataki* Appetizer (Seared Tuna)",
}

DESCRIPTION_FIXUPS = {
    "yuzu shiso soda": "A refreshing house-made Japanese citrus soda with shiso leaves.",
    "egg custard tarts": (
        "Crisp pastry filled with creamy egg custard and baked until golden. "
        "Add chocolate or caramel sauce if desired."
    ),
    "miso soup": (
        "Seaweed, tofu, and negi (green onion) make this soup a warming start "
        "to your meal."
    ),
    "house salad": (
        "Spring mix of leafy greens, garnished with tomatoes and shredded potato "
        "crunch, served with tofu dressing."
    ),
    "seaweed salad": (
        "A medley of hiyashi wakame (green seaweed), wakame (kelp), and cucumbers, "
        "topped with savory vinaigrette."
    ),
    "vegetable tempura": (
        "10 pieces of fresh vegetables selected by the chef, served with house "
        "tempura sauce."
    ),
    "shrimp & veggie tempura": (
        "An assortment of 4 pieces of vegetables selected by our chefs, 6 pieces "
        "of fresh shrimp tempura, and a side of dipping sauce."
    ),
    "pork chashu buns": (
        "3 pieces of barbecued pork belly wrapped in soft buns with cucumber, "
        "special dressing, and chili oil."
    ),
    "baked mussels": (
        "5 savory mussels baked with spicy mayonnaise and unagi sauce."
    ),
    "karaage": (
        "Our best-selling crispy fried chicken, moist and succulent throughout, "
        "served with spicy mayonnaise."
    ),
    "chicken tsukune": (
        "Chicken meatball on a skewer, sprinkled with coarse salt and black pepper, "
        "then grilled to perfection."
    ),
    "chicken teriyaki": "Grilled chicken on a skewer, served with teriyaki sauce.",
    "beef teriyaki": "Grilled beef on a skewer, served with teriyaki sauce.",
    "salmon teriyaki": "Grilled salmon on a skewer, served with teriyaki sauce.",
    "tonkotsu": (
        "Pork broth, naruto, negi, menma, soft-poached egg, and pork belly."
    ),
    "tan tan men": (
        "Spicy ground pork, crispy shallots, bok choy, negi, soft-poached egg, "
        "and shredded peppers."
    ),
    "vegetable ramen": (
        "Vegetable stock, tofu, bean sprouts, bok choy, pickles, soft-poached egg, "
        "cabbage salad, green onion, and macho (roasted jalapeño)."
    ),
}

TEXT_FIXUPS = (
    (r"\bJapaneses\b", "Japanese"),
    (r"\bgree onion\b", "green onion"),
    (r"\bcavair\b", "caviar"),
    (r"\bbokchoy\b", "bok choy"),
    (r"\bblack peppers\b", "black pepper"),
    (r"\bfresh water eel\b", "freshwater eel"),
    (r"\byellow tail\b", "yellowtail"),
    (r"\bbacked with\b", "baked with"),
    (r"\bselect by chef\b", "selected by the chef"),
    (r"\bselected by chef\b", "selected by the chef"),
    (r"\bif desire\b", "if desired"),
    (r"\bchef special\b", "chef's special"),
    (r"\bhouse temp\.\s*sauce\b", "house tempura sauce"),
    (r"\btemp\.\s*sauce\b", "tempura sauce"),
    (r"\bjalapeno\b", "jalapeño"),
    (r"\b(\d+)\s*pcs\b", r"\1 pieces"),
)


def _capitalize_sentences(text: str) -> str:
    text = re.sub(
        r"(^\s*[*★]*\s*)([a-z])",
        lambda match: match.group(1) + match.group(2).upper(),
        text,
    )
    return re.sub(
        r"([.!?]\s+)([a-z])",
        lambda match: match.group(1) + match.group(2).upper(),
        text,
    )


def normalize_name(source_name: str) -> str:
    compact = re.sub(r"\s+", " ", source_name).strip()
    fixed = NAME_FIXUPS.get(compact.casefold())
    if fixed:
        return fixed
    return compact.title()


def normalize_description(source_description: str, source_name: str) -> str:
    compact = re.sub(r"\s+", " ", source_description).strip()
    if not compact:
        return ""

    fixed = DESCRIPTION_FIXUPS.get(source_name.strip().casefold())
    if fixed:
        return fixed

    for pattern, replacement in TEXT_FIXUPS:
        compact = re.sub(pattern, replacement, compact, flags=re.IGNORECASE)
    compact = _capitalize_sentences(compact)
    if compact and compact[-1] not in ".!?":
        compact += "."
    return compact


def normalize_catalog(catalog: dict[str, Any]) -> dict[str, Any]:
    result = dict(catalog)
    normalized_items: list[dict[str, Any]] = []
    for original in catalog.get("items", []):
        item = dict(original)
        source_name = str(item.get("sourceName", item.get("name", "")))
        source_description = str(
            item.get("sourceDescription", item.get("description", ""))
        )
        source_category = str(
            item.get("sourceCategory", item.get("category", ""))
        )
        item.update(
            {
                "sourceName": source_name,
                "sourceDescription": source_description,
                "sourceCategory": source_category,
                "name": normalize_name(source_name),
                "description": normalize_description(
                    source_description, source_name
                ),
            }
        )
        normalized_items.append(item)
    result["items"] = normalized_items
    return result


def load_catalog(path: Path = MENU_PATH) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as menu_file:
        return normalize_catalog(json.load(menu_file))


def write_normalized_catalog(path: Path = MENU_PATH) -> dict[str, Any]:
    catalog = load_catalog(path)
    with path.open("w", encoding="utf-8") as menu_file:
        json.dump(catalog, menu_file, ensure_ascii=False, indent=2)
        menu_file.write("\n")
    return catalog