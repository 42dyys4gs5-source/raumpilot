# Raumvia visual assets

The two room illustrations are AI-generated fictional examples, not customer rooms. All placements label this explicitly. Optimized WebP files avoid serving the large source PNGs.

- `public/media/raum-am-park.webp`: generated with imagegen. Prompt: fictional Swiss community event room, two oak tables, forest-green chairs, tall garden windows, warm natural daylight, no people, no text, editorial architectural photography.
- `public/media/workshop-studio.webp`: generated with imagegen. Prompt: fictional daylight workshop and meeting studio, pale oak table, eight chairs, blank whiteboard, plants, forest-green accents, no people or text, landscape architectural photography.
- `public/media/raumvia-erklaervideo.mp4`: original 48-second silent explainer, 1280×720 H.264 faststart. Rebuild using `scripts/render_raumvia_explainer.py` with Pillow and ffmpeg installed. Poster and WebVTT captions accompany it. The page includes a readable transcript and never autoplays or preloads the video.

The `/demo` experience is local React state only. It does not call booking, checkout, payment, email or customer APIs. Actual product payment code is unchanged.
