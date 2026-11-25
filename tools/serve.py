"""Serve the web/ folder over HTTP on localhost, laid out as it will be on GitHub Pages.

Usage: python3 -I tools/serve.py [port]        (default port 8000)
Then open http://localhost:<port>/mlu-web/mlu1/ or http://localhost:<port>/mlu-web/mlu2/

The web ports use ES modules, which browsers refuse to load from file:// URLs. Each port is
self-contained (its assets are in its own images/), so only web/ is served: it is the folder
that GitHub Pages will publish.

web/ is served under /mlu-web/, as a GitHub Pages project site serves a repository named
mlu-web, so the ports run at the same paths locally as when published. / redirects there;
anything else outside /mlu-web/ is not found. File names are matched case-sensitively, as on
GitHub Pages, even though Windows itself ignores case, and every 404 is printed.

This server pins the MIME types the ports need (Python otherwise takes them from the Windows
registry, where .js can map to text/plain) and sends no-cache headers so a reload always picks
up edited files. It listens on 127.0.0.1 only.
"""
import functools, http.server, os, sys, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "web"
PREFIX = "/mlu-web/"
MISSING = str(ROOT.parent / "tools" / "no such file")  # stands for every path that is not served

TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".wav": "audio/wav",
    ".mid": "audio/midi",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        return TYPES.get(Path(path).suffix.lower()) or super().guess_type(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self._redirect_root():
            return
        super().do_GET()

    def do_HEAD(self):
        if self._redirect_root():
            return
        super().do_HEAD()

    def _redirect_root(self):
        if urllib.parse.urlsplit(self.path).path in ("/", PREFIX.rstrip("/")):
            self.send_response(301)
            self.send_header("Location", PREFIX)
            self.end_headers()
            return True
        return False

    def translate_path(self, path):
        # Only paths under PREFIX exist, and each part must match a file name's case exactly.
        p = urllib.parse.unquote(urllib.parse.urlsplit(path).path)
        if not p.startswith(PREFIX):
            return MISSING
        cur = str(ROOT)
        for part in p[len(PREFIX):].split("/"):
            if not part or part == ".":
                continue
            if part == ".." or not os.path.isdir(cur) or part not in os.listdir(cur):
                return MISSING
            cur = os.path.join(cur, part)
        return cur

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            print(f"404 {self.path}", flush=True)
        super().send_error(code, message, explain)

    def log_message(self, format, *args):
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(Handler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"serving {ROOT} at http://localhost:{port}{PREFIX}mlu1/ and {PREFIX}mlu2/",
              flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
