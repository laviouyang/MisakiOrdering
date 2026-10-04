"""Load Misaki's published menu while preserving its source wording."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


MENU_PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "misaki-menu.json"

NAME_FIXUPS = {
    "spicy siracha": "Spicy Sriracha",
    "st. pellegrino": "San Pellegrino",
    "kanpa hama trio": "Kampachi Hama Trio",
    "maguro tataki* app. (seared tuna)": "Maguro Tataki* Appetizer (Seared Tuna)",
}

DESCRIPTION_FIXUPS = {
    "yuzu shiso soda": "A refreshing house-made Japanese citrus soda with shiso leaves.",
    "raspberry sake": "Yaegaki Reiko sake with raspberry flavor (14 fl oz).",
    "egg custard tarts": (
        "4 crisp pastries filled with creamy egg custard and baked until golden. "
        "Add chocolate or caramel sauce if desired."
    ),
    "★ kuruma ebi (black tiger prawn)": (
        "Cooked, super-premium giant tiger shrimp topped with our house-special "
        "spicy sauce."
    ),
    "chuka idako (baby octopus)": (
        "Cooked, sweetly marinated baby octopus. 2 pieces per order."
    ),
    "kanpa hama trio": (
        "2 pieces of kampachi (amberjack) nigiri and 2 pieces of hamachi "
        "(yellowtail) sashimi, served with a negihama maki."
    ),
    "sashimi appetizer*": (
        "Includes 2 pieces each of maguro, shake, and hamachi sashimi."
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
    "negitoro*": (
        "Toro (fatty tuna) and negi (green onion). Available as a 6-piece roll "
        "or hand roll."
    ),
    "moriawase*": (
        "Includes 2 pieces of maguro, 1 piece of shake, 1 piece of hamachi, "
        "1 piece of ebi, 1 piece of bincho, and your choice of spicy poke, "
        "Nova Lox salmon roll, or shrimp tempura roll. Served with soup and salad."
    ),
    "beginner's combo*": (
        "Includes 2 pieces each of maguro, shake, hamachi, and ebi, plus a "
        "California roll. Served with soup and salad."
    ),
    "sashimi combo*": (
        "Includes 3 pieces each of maguro, shake, hamachi, tako, and white fish. "
        "Served with soup and salad."
    ),
    "chirashi*": (
        "A bed of rice with garikan, furikake, Japanese pickles, and a variety "
        "of sashimi selected by the chef. Served with soup and salad."
    ),
    "vegetable egg rolls": (
        "3 crispy vegetable egg rolls served with a side of sweet chili sauce."
    ),
    "gyoza - chicken & pork": "6 pan-fried chicken and pork dumplings.",
    "gyoza - vegetable": "6 pan-fried vegetable dumplings.",
    "kanpyo maki (6 pieces)": (
        "Sweet pickled dried gourd, a traditional Japanese maki roll."
    ),
    "expert roll tempura (6 pieces)": (
        "Baked salmon, avocado, shiso, mayonnaise, unagi sauce, masago, and "
        "cream cheese, deep-fried in tempura."
    ),
    "when pigs swim*": (
        "Salmon skin and bacon with jalapeño and avocado, topped with tuna, "
        "spicy miso mayonnaise, and negi."
    ),
    "surf and turf*": (
        "Snow crab tempura and avocado, topped with torched tri-tip beef, "
        "garlic butter, and yuzu mustard."
    ),
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
    (r"\bjapanese\b", "Japanese"),
    (r"\bgree onion\b", "green onion"),
    (r"\bcavair\b", "caviar"),
    (r"\bbokchoy\b", "bok choy"),
    (r"\bsriracha\b", "Sriracha"),
    (r"\bkewpie\b", "Kewpie"),
    (r"\bmaui\b", "Maui"),
    (r"\bblack peppers\b", "black pepper"),
    (r"\bfresh water eel\b", "freshwater eel"),
    (r"\byellow tail\b", "yellowtail"),
    (r"\bbacked with\b", "baked with"),
    (r"\bselect by chef\b", "selected by the chef"),
    (r"\bselected by chef\b", "selected by the chef"),
    (r"\bif desire\b", "if desired"),
    (r"\bchef special\b", "chef's special"),
    (r"\bhouse made\b", "house-made"),
    (r"\bhouse special\b", "house-special"),
    (r"\bsweet marinated\b", "sweetly marinated"),
    (r"\bhouse temp\.\s*sauce\b", "house tempura sauce"),
    (r"\btemp\.\s*sauce\b", "tempura sauce"),
    (r"\bjalapenos\b", "jalapeños"),
    (r"\bjalapeno\b", "jalapeño"),
    (r"\b(\d+)\s*pcs\b", r"\1 pieces"),
)
SMALL_NAME_WORDS = {"and", "for", "in", "of", "on", "the", "to", "with"}
SMALL_NAME_WORD_PATTERN = re.compile(
    r"\b(" + "|".join(sorted(word.title() for word in SMALL_NAME_WORDS)) + r")\b"
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


def normalize_name(source_name: str, source_description: str = "") -> str:
    compact = re.sub(r"\s+", " ", source_name).strip()
    compact = re.sub(r"(\d+)\s*pcs\b", r"\1 pieces", compact, flags=re.I)
    fixed = NAME_FIXUPS.get(compact.casefold())
    base_name = fixed if fixed else compact.title()
    size = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(oz|ml)", source_description.strip(), re.I)
    if size:
        unit = "mL" if size.group(2).casefold() == "ml" else "oz"
        return f"{base_name} ({size.group(1)} {unit})"
    base_name = SMALL_NAME_WORD_PATTERN.sub(
        lambda match: match.group(1).lower(), base_name
    )
    first_word = re.search(r"[A-Za-zÀ-ÖØ-öø-ÿ]+", base_name)
    if first_word:
        base_name = (
            base_name[: first_word.start()]
            + first_word.group(0)[0].upper()
            + base_name[first_word.start() + 1 :]
        )
    base_name = re.sub(r"\bjalapeno\b", "Jalapeño", base_name, flags=re.I)
    base_name = re.sub(
        r"(?<=[A-Za-z])'([A-Z])",
        lambda match: "'" + match.group(1).lower(),
        base_name,
    )
    base_name = re.sub(r"\s+\*", "*", base_name)
    base_name = re.sub(r"\*(\()", r"* \1", base_name)
    base_name = re.sub(r"\((\d+)\s+Pieces\)", r"(\1 pieces)", base_name)
    return base_name


def normalize_description(source_description: str, source_name: str) -> str:
    compact = re.sub(r"\s+", " ", source_description).strip()
    if not compact:
        return ""

    fixed = DESCRIPTION_FIXUPS.get(source_name.strip().casefold())
    if fixed:
        return fixed

    compact = re.sub(
        r"\b(\d+)\s*(?:pcs|pieces)\s*/\s*order\b",
        r"\1 pieces per order",
        compact,
        flags=re.IGNORECASE,
    )
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
                "name": normalize_name(source_name, source_description),
                "description": normalize_description(
                    "" if re.fullmatch(
                        r"\d+(?:\.\d+)?\s*(?:oz|ml)",
                        source_description.strip(),
                        re.I,
                    ) else source_description,
                    source_name,
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