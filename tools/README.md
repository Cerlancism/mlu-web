# tools

- `serve.py`: the local web server. It serves `web/` under `/mlu-web/web/`, where GitHub Pages publishes it. Run `python3 tools/serve.py [port]`, then open `http://localhost:8000/mlu-web/web/`.
- `make_icons.py`: makes the site icons from the games' sprites. It needs Pillow.
- `make_og_images.py`: makes the link-preview images (`og-image.jpg`) from the games' start pages and sprites. It needs Pillow.
- `autopilot_sim.mjs`: tests the MLU 1 autopilot without a browser, playing whole games much faster than real time with seeded random numbers. Run `node tools/autopilot_sim.mjs [--seed n] [--games n] [--level 1|2|3] [--ticks n] [--log n]`.
