// Misaki Ordering desktop app (Mac + Windows).
//
// The built web app expects to live at the root of a website ("/assets/...").
// Opening dist/index.html straight from disk (file://) breaks every one of those
// paths, which is what caused the white screen. Instead we serve the build from
// a private "app://misaki" origin, so paths, localStorage and IndexedDB (saved
// photos, menu edits, demo orders) all behave exactly like they do in a browser.

const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const SCHEME = 'app';
const HOST = 'misaki';
const ORIGIN = `${SCHEME}://${HOST}`;
const WEB_ROOT = path.join(__dirname, 'web');

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

function resolveFile(requestUrl) {
  const { pathname } = new URL(requestUrl);
  let relative = decodeURIComponent(pathname);
  if (relative.endsWith('/')) relative += 'index.html';
  const filePath = path.normalize(path.join(WEB_ROOT, relative));
  // Never serve anything outside the bundled web folder.
  if (filePath !== WEB_ROOT && !filePath.startsWith(WEB_ROOT + path.sep)) return null;
  return filePath;
}

function registerAppProtocol() {
  protocol.handle(SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    // The desktop app has no menu API server; let those calls fail cleanly so the
    // app falls back to its bundled menu instead of receiving an HTML page.
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Offline desktop build' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      });
    }
    const filePath = resolveFile(request.url);
    if (!filePath) return new Response('Not found', { status: 404 });
    const target = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
      ? filePath
      : path.join(WEB_ROOT, 'index.html'); // single-page app fallback
    return net.fetch(pathToFileURL(target).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 560,
    title: 'Misaki Ordering',
    backgroundColor: '#f2f4f8',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Links to other sites (e.g. Misaki's website) open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.MISAKI_DEV_URL;
    if (url.startsWith(ORIGIN) || (devUrl && url.startsWith(devUrl))) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  // If the page ever fails to load, show why instead of a blank window.
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    const message = `Misaki Ordering could not load ${url} (${code}: ${description}).`;
    console.error(message);
    void win.loadURL(`data:text/html,<body style="font-family:system-ui;padding:40px;color:%231c2954"><h2>Something went wrong</h2><p>${encodeURIComponent(message)}</p></body>`);
  });

  if (process.env.MISAKI_DEV_URL) {
    void win.loadURL(process.env.MISAKI_DEV_URL);
  } else {
    void win.loadURL(`${ORIGIN}/`);
  }
}

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
