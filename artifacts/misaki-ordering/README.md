# Misaki Ordering

A responsive installable web app for browsing Misaki @ Superior's online menu and building an order on a Mac or phone.

## Run

Open the Replit app preview while developing. For an installable copy on a phone or Mac, publish the web app and visit its secure link:

- **iPhone/iPad:** open the link in Safari, tap Share, then choose **Add to Home Screen**.
- **Android:** open the link in Chrome and choose **Install app** or **Add to Home screen**.
- **Mac:** open in a supported browser and use its **Install** / **Add to Dock** option when offered. It also runs as a regular browser tab.

The service worker caches the app shell for subsequent offline launches. The catalog is bundled with the app.

## Menu source and verification

`src/data/misaki-menu.json` contains 148 products transcribed from Misaki's public online ordering page, captured October 2, 2026. Names, descriptions, prices, item availability and source menu sections are included. Seven entries were marked unavailable by the published page at capture time. The `Sake (21+)` category is age-restricted in the prototype.

Menu source: <https://www.misakiatsuperior.com/online-ordering-1>

Prices and availability can change; verify them with Misaki before using the app for customer orders.

## Photos and orders

Dish photos can be uploaded, replaced, or removed from the menu photo controls. Images are stored in IndexedDB on the current browser/device; they do **not** sync to a different phone or Mac. Re-upload them on another device.

Orders are a local demo only. This app does not send orders to Misaki, collect payment, connect to a POS, or confirm fulfillment. Tax and any delivery fees are labeled as estimates until the restaurant supplies its actual business rules.