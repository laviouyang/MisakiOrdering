import unittest

from menu_data import normalize_catalog, normalize_description, normalize_name


class MenuCopyTests(unittest.TestCase):
    def test_corrects_clear_name_typos_and_capitalization(self) -> None:
        self.assertEqual(normalize_name("spicy Siracha"), "Spicy Sriracha")
        self.assertEqual(
            normalize_name("St. Pellegrino500ml"),
            "San Pellegrino (500 mL)",
        )
        self.assertEqual(normalize_name("cucumber roll (6 pieces)"), "Cucumber Roll (6 Pieces)")

    def test_corrects_description_casing_and_common_typos(self) -> None:
        self.assertEqual(
            normalize_description("gree onion, bokchoy, and jalapeno", "dish"),
            "Green onion, bok choy, and jalapeño.",
        )

    def test_preserves_exact_source_fields_and_prices(self) -> None:
        catalog = {
            "sourceUrl": "https://example.com",
            "capturedOn": "2026-10-02",
            "items": [
                {
                    "id": "menu-1",
                    "category": "Sides",
                    "sourceCategory": "sides",
                    "name": "white rice",
                    "description": "",
                    "price": 2.75,
                    "sourcePrice": "$2.75",
                    "availability": "available",
                }
            ],
        }
        normalized = normalize_catalog(catalog)["items"][0]
        self.assertEqual(normalized["sourceName"], "white rice")
        self.assertEqual(normalized["sourceDescription"], "")
        self.assertEqual(normalized["sourceCategory"], "sides")
        self.assertEqual(normalized["name"], "White Rice")
        self.assertEqual(normalized["price"], 2.75)


if __name__ == "__main__":
    unittest.main()