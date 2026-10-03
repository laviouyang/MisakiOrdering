# Misaki Online Ordering — FBLA prototype

A self-contained, responsive browser prototype for the 2026–2027 FBLA Introduction to Programming topic, “Local Business Digital Ordering System.” Open `index.html` in a modern browser; no installation or third-party JavaScript libraries are required.

## Demo flow

1. Browse by menu category or search for an item.
2. Add dishes to the order and adjust quantities. The prototype enforces each demo item's stock; the miso ramen is intentionally marked unavailable.
3. Optionally set a maximum budget. Adds that would exceed it are blocked; checkout rechecks the full estimated total.
4. Choose pickup, delivery, or dine-in. Delivery requires an address and adds a demo delivery fee.
5. Enter a name and 10-digit phone number, then review the full order before placing it.
6. The confirmation and most recent order are saved locally in the browser. Refreshing preserves the latest demo order on that device.

## Important demo-only limits

- The menu names, descriptions, prices, stock quantities, tax rate, and delivery fee are illustrative prototype values. They are not a verified copy of Misaki's full menu and must be replaced/approved by the restaurant before live use.
- The app does not transmit orders to Misaki, collect payment, or connect to a POS, delivery provider, or inventory system. “Place demo order” only updates in-browser demo state.
- The 8% tax and $3.99 delivery fee are placeholders; configure the correct local rates and business rules before launch.
- Menu and demo order data live in the browser only. A production service needs a backend, secure persistence, and staff order management.
- The simple CSS food illustrations and emoji avoid external image/library dependencies.

## FBLA requirements demonstrated

- Menu browsing and category search (array-based menu data and filters)
- Add/remove items, quantity controls, stock limits, and unavailable items
- Subtotal, estimated tax, delivery fee, and total calculations
- Budget constraint and checkout validation
- Customer input validation (required name, 10-digit phone, delivery address)
- Order review, confirmation, and local recent-order record
- Clear instructions, responsive layout, reusable functions, and readable source

## Research and credits

- FBLA, *2026–2027 Competitive Events Guidelines: Introduction to Programming*, pp. 1–2 and 7–8, supplied by the user. The app covers the topic's browsing, order management, totals, review, real-world constraints and rating-sheet goals.
- Misaki @ Superior, official website and online-order page: [misakiatsuperior.com](https://www.misakiatsuperior.com/) and [online ordering](https://www.misakiatsuperior.com/online-ordering-1). The website confirms the Superior address/contact/hours, Japanese restaurant focus, and online-order categories such as nigiri/sashimi, rolls, ramen, kushiyaki, starters, and drinks. The online page states a $10 minimum. These site facts are represented in the prototype; sample item details are not claimed as official.
- No external code libraries, templates, stock photography, or third-party assets are used.

## Source code

The complete HTML, CSS, and JavaScript source is in `index.html`.
