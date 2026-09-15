# Design assets

## Construction sunset

- Project file: `public/images/construction-sunset.webp`
- Dimensions: 1536 × 1024 pixels.
- Generation: built-in `image_gen` tool (no API/CLI fallback).
- Processing: WebP encoding with Sharp, quality 86, effort 6. The original generated PNG is preserved.
- Intended use: homepage photographic backdrop.

### Exact generation prompt

```text
Use case: ads-marketing
Asset type: photographic background for a premium public-works construction estimating software homepage.
Primary request: create a photorealistic cinematic road construction scene at sunset, landscape 3:2 aspect ratio, high-resolution.
Scene/backdrop: a newly built rural highway with rough gravel shoulder, a few orange road cones, distant wooded rolling hills, dramatic deep midnight-blue storm clouds across the sky with a narrow glowing burnt-orange sunset near the horizon.
Subject: one realistic yellow tracked excavator, with an articulated digging arm and steel bucket, resting on gravel in the right half of the frame. Machinery has believable engineering and no brand marks.
Composition/framing: wide low-angle landscape photograph, excavator is fully visible in the lower-right quadrant, horizon in the lower third. Left half and upper half are spacious dark navy sky and dark understated terrain with very low visual noise for white headline text added later in HTML. Machine must not occupy the left half.
Lighting/mood: elegant cinematic natural photographic lighting, warm orange rim light catching the excavator and a few dust particles, cool blue cloud detail and foreground shadows; confident industrial atmosphere, premium restrained color grading, realistic depth and texture.
Constraints: image only, absolutely no letters, no text, no logos, no watermark, no UI, no borders, no frames, no people. No neon line effects. Keep left half dark enough for legible white page copy.
```

