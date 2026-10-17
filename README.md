# Misaki Ordering

An ordering app for Misaki @ Superior. Customers browse the menu, build an order
and review it. It runs in a web browser, as a Mac or Windows app, and as an
iPhone app — all from the same code.

## Where things are

| File or folder | What it is |
| --- | --- |
| `src/App.tsx` | The main app: menu, cart, item notes, checkout, "Order again" and the menu editor |
| `src/RewardsPage.tsx` | The Rewards page and its stamp card |
| `src/AboutPage.tsx` | The About page: the restaurant's story and how to find it |
| `src/index.css` | All the colors, fonts and layout |
| `src/data/misaki-menu.json` | The menu: every dish, price and category, in the order they appear |
| `src/main.tsx` | Starts the app (you rarely need to touch this) |
| `src/ErrorBoundary.tsx` | Shows a message instead of a blank page if something crashes |
| `public/` | App icons and offline support for the website |
| `electron/` | The Mac and Windows app wrapper |
| `ios/` | The iPhone app project (opens in Xcode) |

## Commands

Run these in Terminal from the project folder. Run `npm install` once first,
and again whenever you pull changes that add packages.

```bash
npm install          # download what the app needs
npm run dev          # open the app in your browser while you work on it
npm run desktop      # open it as a Mac/Windows app
npm run desktop:mac  # make a Mac installer (.dmg) in the release folder
npm run desktop:win  # make a Windows installer (run this on a Windows PC)
npm run ios          # update the iPhone app and open it in Xcode
npm run check        # look for code mistakes
```

While `npm run dev` is running, saving a file updates the browser right away.
Press Control+C in Terminal to stop it.

## Getting the Mac and Windows installers from GitHub

You don't need a Windows PC. On GitHub, open the repo's **Actions** tab, pick
**Build desktop apps**, and click **Run workflow**. When it finishes, download
the installers from the run's **Artifacts** section.

The apps aren't code-signed yet. The first time you open one on a Mac,
right-click it and choose **Open**. On Windows, click **More info → Run anyway**
if a warning appears.

## Changing the menu

Edit `src/data/misaki-menu.json`. Each dish looks like this:

```json
{ "id": "menu-001", "category": "Sides", "name": "White Rice", "description": "",
  "price": 2.75, "availability": "available", ... }
```

Set `"availability"` to `"unavailable"` to show a dish as sold out. Keep each
`id` unique and don't change existing ones, since saved photos are linked to them.

You can also change names, prices and availability from **Edit menu** inside
the app, but those edits are saved only on that device.

The menu was copied from Misaki's online ordering page
(<https://www.misakiatsuperior.com/online-ordering-1>) on October 2, 2026.
Prices change, so check them with Misaki before taking real orders.

## What the app does and doesn't do

- Dish photos and menu edits are saved on the device they were made on. They
  don't sync to other devices.
- Saved orders stay on the customer's device. To place one, the customer calls
  Misaki or shows the order at the counter, and pays at the restaurant. Add the
  restaurant's phone number in **Edit menu → Shop details** so it shows after ordering.
- Tax and delivery fees are estimates until the restaurant confirms its rules.
- Rewards: each saved order earns one stamp. With a full card (8 stamps by
  default), the customer shows the Rewards page at the counter. Stamps are saved
  on the customer's device. Change the prize and number of stamps in
  **Edit menu → Shop details**, after checking with Misaki.
- The About page story, hours and phone number are also set in
  **Edit menu → Shop details**. Hours stay hidden until you fill them in.
