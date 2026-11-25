# tools

- `serve.py`: the local web server. It serves `web/` under `/mlu-web/web/`, where GitHub Pages publishes it. Run `python3 tools/serve.py [port]`, then open `http://localhost:8000/mlu-web/web/`.
- `make_icons.py`: makes the site icons from the games' sprites. It needs Pillow.
- `make_og_images.py`: makes the link-preview images (`og-image.jpg`) from the games' start pages and sprites. It needs Pillow.
