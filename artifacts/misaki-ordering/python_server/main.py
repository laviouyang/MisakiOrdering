"""Read-only Python API for the published Misaki menu catalog."""

from __future__ import annotations

import json
import logging
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from menu_data import load_catalog


LOGGER = logging.getLogger("misaki-menu-api")
CATALOG = load_catalog()


class MenuRequestHandler(BaseHTTPRequestHandler):
    server_version = "MisakiMenuAPI/1.0"

    def _send_json(self, status: int, payload: dict[str, object]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        path = urlsplit(self.path).path
        if path == "/healthz":
            self._send_json(200, {"status": "ok"})
            return
        if path == "/menu":
            self._send_json(200, CATALOG)
            return
        self._send_json(404, {"error": "Not found"})

    def log_message(self, format_string: str, *args: object) -> None:
        LOGGER.info(format_string, *args)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    port = int(os.environ.get("MISAKI_MENU_PORT", "8765"))
    server = ThreadingHTTPServer(("127.0.0.1", port), MenuRequestHandler)
    LOGGER.info("Python menu API listening on loopback port %s", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        LOGGER.info("Python menu API stopping")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()