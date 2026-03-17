# Color Palette Tools & Generators Research (2025-2026)

Research compiled for MediTrack dark mode design work. Covers 22 tools across categories: AI-powered generators, accessibility-focused tools, Tailwind-specific generators, design system tools, and community/inspiration platforms.

---

## 1. Coolors

- **URL**: https://coolors.co/
- **What it does**: Fast, intuitive color palette generator. Spacebar to generate random palettes. Extract colors from images, check accessibility, preview on real designs.
- **Key features**: AI Color Bot (chat-based suggestions), color blindness simulation, palette locking, image color extraction, Tailwind CSS dedicated view, Figma/Adobe/Chrome plugins.
- **Pricing**: Free (with ads/limits). Pro at $3/mo (advanced PDF export, unlimited palettes, no ads).
- **Export**: CSS, SCSS, SVG, PNG, PDF, Tailwind config, Adobe ASE, GIMP GPL. Web, UI, Print, Motion presets.
- **Dark mode palette support**: Yes -- has dedicated dark palette collections and trending dark palettes.
- **API**: No public REST API documented. Export-oriented workflow.

---

## 2. Adobe Color

- **URL**: https://color.adobe.com/
- **What it does**: Professional color wheel and theme creation tool. AI-powered (Adobe Sensei) palette suggestions. Accessibility checker built in.
- **Key features**: Color wheel with harmony rules, extract themes from images, WCAG contrast checker, color blindness simulation, Creative Cloud Libraries sync, community explore/trends.
- **Pricing**: Free (full features). Enhanced collaboration via Creative Cloud subscription.
- **Export**: CSS, XML, LESS. RGB, LAB, CMYK, HSV, Pantone conversions. Syncs to Photoshop, Illustrator, XD via CC Libraries.
- **Dark mode palette support**: No dedicated dark mode generator, but contrast checker helps validate dark themes.
- **API**: No public API for palette generation. Integrates via Creative Cloud Libraries.

---

## 3. Leonardo (Adobe Open Source)

- **URL**: https://leonardocolor.io/ | https://github.com/adobe/leonardo
- **What it does**: Contrast-based color generation. Creates adaptive, accessible color palettes for UI and data visualization. Open source by Adobe.
- **Key features**: Generate colors by target contrast ratio, color vision deficiency simulation, adaptive theme generation (light/dark from same config), multiple workspaces (themes, data viz, toolbox).
- **Pricing**: Free, open source (Apache 2.0).
- **Export**: JavaScript API (`@adobe/leonardo-contrast-colors`) with `generateContrastColors()`, `generateBaseScale()`, `generateAdaptiveTheme()`. JSON config export.
- **Dark mode palette support**: YES -- first-class. Adaptive themes generate both light and dark modes from a single color definition by adjusting the background lightness.
- **API**: Yes -- npm package `@adobe/leonardo-contrast-colors`. Programmatic generation of contrast-based palettes.

---

## 4. Khroma

- **URL**: https://www.khroma.co/
- **What it does**: AI/neural network learns your color preferences from a training set you select, then generates infinite palettes tailored to your taste.
- **Key features**: Train a personal color AI, view combos as typography/gradient/palette/custom image, search/filter by hue/tint/value/hex/RGB, WCAG accessibility ratings, unlimited personal library, image-based palette extraction.
- **Pricing**: Completely free.
- **Export**: Hex, RGB, CSS code. Copy individual values.
- **Dark mode palette support**: Not a dedicated feature, but can generate dark-oriented palettes by training on dark colors.
- **API**: No public API.

---

## 5. Realtime Colors

- **URL**: https://www.realtimecolors.com/
- **What it does**: Visualize your color palette on a real website layout in real time. Pick text, background, primary, secondary, and accent colors and see them applied instantly.
- **Key features**: 10 color scheme modes (monochromatic, complementary, analogous, triadic, etc.), WCAG contrast checker, custom color picker with eyedropper, Figma plugin, VS Code extension, color game for learning.
- **Pricing**: Free.
- **Export**: CSS, SCSS, .zip, .png, QR code, Figma plugin export.
- **Dark mode palette support**: Yes -- can toggle between light and dark previews to see how your palette works in both modes.
- **API**: No public API. Export-based workflow.

---

## 6. Huemint

- **URL**: https://huemint.com/
- **What it does**: Machine learning-based color scheme generator specifically for branding, websites, and graphics. Shows palettes applied to realistic mockups.
- **Key features**: AI generates palettes for specific use cases (brand identity, website, gradient, illustration), adjustable "creativity" slider, preview on mockups, multiple generation modes.
- **Pricing**: Free.
- **Export**: Hex codes, CSS. Copy from interface.
- **Dark mode palette support**: Can generate dark-themed palettes when using website/brand templates with dark backgrounds.
- **API**: No public API.

---

## 7. ColorMagic

- **URL**: https://colormagic.app/
- **What it does**: AI color palette generator from keywords, text descriptions, images, or hex codes. Generates palettes in seconds based on natural language input.
- **Key features**: Text/keyword-based generation, image color extraction, contrast checker, color blindness check, random color generator, curated palette library with theme categories (dark, aesthetic, seasonal).
- **Pricing**: Free (with limits). Premium plans available.
- **Export**: CSS variables, PNG, PDF, SVG.
- **Dark mode palette support**: YES -- dedicated dark palette generator and dark palette exploration category.
- **API**: No public API documented.

---

## 8. Colormind

- **URL**: http://colormind.io/
- **What it does**: Deep learning color palette generator trained on photographs, movies, and art. Generates aesthetically pleasing 5-color palettes.
- **Key features**: Random generation, lock individual colors, trained on real-world color data, website color preview mode, image-based palette extraction.
- **Pricing**: Free.
- **Export**: Hex codes. Copy from interface.
- **Dark mode palette support**: No dedicated feature.
- **API**: YES -- REST API available. POST to `http://colormind.io/api/` with JSON body. Returns 5-color palettes. Supports model selection and color locking.

---

## 9. Coolors / Muzli Colors

- **URL**: https://colors.muz.li/
- **What it does**: AI-driven palette tool from the Muzli design ecosystem. Enter a color code, name, or image to generate production-ready palettes.
- **Key features**: AI suggestions, integration with Muzli design inspiration ecosystem, quick palette generation from any input.
- **Pricing**: Free.
- **Export**: Hex, RGB. Copy-based workflow.
- **Dark mode palette support**: Not a dedicated feature.
- **API**: No public API.

---

## 10. UI Colors

- **URL**: https://uicolors.app/
- **What it does**: Tailwind CSS-specific color palette generator. Input a hex code, get a full 50-950 shade scale ready for tailwind.config.js.
- **Key features**: Full 11-shade generation (50-950), manual shade editing, component preview with generated colors, success/warning/error/neutral scale generation, Figma plugin with auto color variables, save and share palettes.
- **Pricing**: Free. Pro tier available for additional features.
- **Export**: Tailwind config JSON, CSS variables. Figma plugin export.
- **Dark mode palette support**: Generates full shade ranges that work for both light and dark -- the 50-950 scale inherently supports dark mode usage.
- **API**: YES -- documented at https://uicolors.app/api. Returns 50-950 palette in hex and HSL from a single hex input.

---

## 11. Tints.dev

- **URL**: https://www.tints.dev/
- **What it does**: Open-source Tailwind CSS 11-color palette generator with API. Input one hex, get a full 50-950 scale with customizable hue/saturation/lightness curves.
- **Key features**: HSL curve adjustments, multiple palette management, ready-to-use tailwind.config.js snippets, open source (GitHub).
- **Pricing**: Free, open source.
- **Export**: Tailwind config JSON, CSS variables.
- **Dark mode palette support**: Full 50-950 range inherently supports dark mode patterns.
- **API**: YES -- REST API. Fetch palettes by hex value. Returns full 50-950 scale.

---

## 12. Tailwind Shades

- **URL**: https://tailwindshades.app/
- **What it does**: Quick Tailwind color shade generator with CSS variable output. Designed for dynamic theming.
- **Key features**: Fast shade generation, CSS custom properties output, designed for component libraries that change colors via CSS variables.
- **Pricing**: Free.
- **Export**: Tailwind config, CSS variables.
- **Dark mode palette support**: CSS variable approach enables dark mode switching.
- **API**: No public API.

---

## 13. Paletton

- **URL**: https://paletton.com/
- **What it does**: Classic color scheme designer based on color theory. Interactive color wheel with 5 harmony modes.
- **Key features**: Monochromatic, adjacent, triad, tetrad, freestyle modes. Color blindness simulation (daltonism variants). WCAG contrast checker. Shareable links.
- **Pricing**: Free.
- **Export**: HTML, CSS, LESS, SASS, XML, text, PNG, Photoshop ACO swatch, GIMP GPL palette.
- **Dark mode palette support**: No dedicated feature, but freestyle mode allows dark-oriented schemes.
- **API**: No public API.

---

## 14. ColorSpace

- **URL**: https://mycolor.space/
- **What it does**: Generates matching color palettes and CSS gradients from a single hex code. Multiple palette styles (generic, spot, natural, etc.).
- **Key features**: Multiple palette algorithms, 2-color and 3-color CSS gradient generator with code output, simple interface.
- **Pricing**: Free.
- **Export**: CSS gradient code, hex values.
- **Dark mode palette support**: No dedicated feature.
- **API**: No public API.

---

## 15. Color Hunt

- **URL**: https://colorhunt.co/
- **What it does**: Community-curated collection of 4-color palettes. Browse trending, popular, and categorized palettes.
- **Key features**: Community voting/ranking, category filters (dark, pastel, vintage, neon, etc.), image color picker, palette collections/projects, mobile app (Android).
- **Pricing**: Free.
- **Export**: Image, PDF, link sharing. Copy hex codes.
- **Dark mode palette support**: YES -- dedicated "Dark" palette category with thousands of community-curated dark palettes.
- **API**: No public API.

---

## 16. PaletteMaker

- **URL**: https://palettemaker.com/
- **What it does**: Generate palettes and preview them live on real design examples (logos, UI, posters, patterns, illustrations).
- **Key features**: Live preview on multiple design contexts, color theory-based generation, filtering, export in multiple formats. Free to use.
- **Pricing**: Free.
- **Export**: Multiple formats (details vary). Copy hex values.
- **Dark mode palette support**: UI mockup previews may include dark contexts.
- **API**: No public API.

---

## 17. ColorKit

- **URL**: https://colorkit.co/
- **What it does**: AI palette generator with description-based input. Full color toolkit including palette generator, color mixer, contrast checker.
- **Key features**: AI generation from text descriptions, color harmonies, palette saving/collections, contrast checking.
- **Pricing**: Free (registration for saving).
- **Export**: PNG, SVG, CSS code.
- **Dark mode palette support**: No dedicated feature.
- **API**: No public API documented.

---

## 18. Colorffy

- **URL**: https://colorffy.com/
- **What it does**: CSS color palette and gradient generator with a dedicated dark theme generator. Turns brand colors into production-ready light/dark theme code.
- **Key features**: Dark theme generator (input brand colors, get full surface/text/accent dark theme), gradient generator, accessibility contrast checking, palette exploration.
- **Pricing**: Free.
- **Export**: Tailwind config, CSS custom properties, SCSS variables, PNG, PDF.
- **Dark mode palette support**: YES -- dedicated dark theme generator is the standout feature. Calculates accessible surface, text, and accent shades automatically.
- **API**: No public API.

---

## 19. Atmos

- **URL**: https://atmos.style/
- **What it does**: Professional palette creation tool focused on uniform, accessible color scales for UI design systems.
- **Key features**: Shade generation with perceptual uniformity, accessibility checking, Figma plugin (Atmos Sync), designed for design system workflows.
- **Pricing**: Free tier available. Paid plans for teams.
- **Export**: Figma plugin sync. CSS/design tokens.
- **Dark mode palette support**: Uniform shade scales support dark mode usage patterns.
- **API**: No public API. Figma plugin integration.

---

## 20. Radix Colors

- **URL**: https://www.radix-ui.com/colors
- **What it does**: Pre-built, accessible color system with 12-step scales designed for UI. Each scale has a light and dark variant built in.
- **Key features**: 12-step semantic scales (background, component, border, text), automatic dark mode counterparts, alpha color variants, P3 wide gamut support, designed for composability.
- **Pricing**: Free, open source.
- **Export**: CSS, npm package (`@radix-ui/colors`). Tailwind plugins available (tailwindcss-radix-colors, windy-radix-palette).
- **Dark mode palette support**: YES -- first-class. Every color scale ships with a dark mode counterpart. Automatic switching via CSS.
- **API**: npm package for programmatic access. CSS custom properties.

---

## 21. Eva Design System Color Generator

- **URL**: https://colors.eva.design/
- **What it does**: Generates semantic color scales (shades 100-900) from a single primary color, following the Eva Design System methodology.
- **Key features**: Semantic color generation, lock individual shades, generates complete primary/success/info/warning/danger scales, designed for UI frameworks (NativeBase, UI Kitten).
- **Pricing**: Free.
- **Export**: JSON, copy hex values.
- **Dark mode palette support**: Not a dedicated feature, but generated scales include dark shades usable in dark themes.
- **API**: No public API.

---

## 22. Dopely Colors

- **URL**: https://colors.dopely.top/
- **What it does**: Comprehensive color toolkit with palette generator, color wheel, color converter, gradient generator, and more.
- **Key features**: Palette generator, color wheel with harmony rules, color converter (HEX/RGB/HSL/CMYK), gradient generator, color blender, tint/shade generator, image color picker.
- **Pricing**: Free.
- **Export**: Copy hex/RGB/HSL values. Download options vary by tool.
- **Dark mode palette support**: No dedicated feature.
- **API**: No public API.

---

## Summary Comparison Table

| Tool | AI-Powered | Dark Mode | Accessibility | Tailwind Export | API | Free |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Coolors | Yes | Yes | Yes | Yes | No | Freemium |
| Adobe Color | Yes | No | Yes | No | No | Free |
| Leonardo | No | **Yes** | **Yes** | No | **Yes** | Free/OSS |
| Khroma | Yes | No | Yes | No | No | Free |
| Realtime Colors | No | Yes | Yes | No | No | Free |
| Huemint | Yes | Partial | No | No | No | Free |
| ColorMagic | Yes | Yes | Yes | No | No | Freemium |
| Colormind | Yes | No | No | No | **Yes** | Free |
| UI Colors | No | Implicit | No | **Yes** | **Yes** | Freemium |
| Tints.dev | No | Implicit | No | **Yes** | **Yes** | Free/OSS |
| Tailwind Shades | No | Implicit | No | **Yes** | No | Free |
| Paletton | No | No | Yes | No | No | Free |
| ColorSpace | No | No | No | No | No | Free |
| Color Hunt | No | Yes | No | No | No | Free |
| PaletteMaker | No | Partial | No | No | No | Free |
| ColorKit | Yes | No | Yes | No | No | Free |
| Colorffy | No | **Yes** | Yes | **Yes** | No | Free |
| Atmos | No | Implicit | Yes | No | No | Freemium |
| Radix Colors | No | **Yes** | **Yes** | **Yes** (plugins) | **Yes** (npm) | Free/OSS |
| Eva Design | No | Partial | No | No | No | Free |
| Dopely | No | No | No | No | No | Free |
| Muzli Colors | Yes | No | No | No | No | Free |

---

## Top Picks by Use Case

### For MediTrack Dark Mode Work
1. **Leonardo** -- contrast-based adaptive themes, generates light+dark from one config, open source with JS API
2. **Radix Colors** -- pre-built 12-step scales with automatic dark mode, Tailwind plugins available
3. **Colorffy** -- dedicated dark theme generator, outputs CSS custom properties and Tailwind config
4. **Realtime Colors** -- live preview of palette on a real website layout, instant light/dark toggle

### For Tailwind CSS Integration
1. **UI Colors** -- purpose-built for Tailwind, API available, full 50-950 shade generation
2. **Tints.dev** -- open source, API, customizable HSL curves
3. **Coolors** -- dedicated Tailwind view and export
4. **Colorffy** -- Tailwind config export included

### For Accessibility-First Design
1. **Leonardo** -- contrast ratio is the primary input, not an afterthought
2. **Adobe Color** -- WCAG contrast checker built into the color wheel
3. **Radix Colors** -- designed from the ground up for accessible UI
4. **Paletton** -- color blindness simulation and WCAG checker

### For AI/Generative Palettes
1. **Khroma** -- trains on your preferences, completely free
2. **ColorMagic** -- natural language input, dark palette support
3. **Huemint** -- ML-generated schemes with mockup previews
4. **Coolors AI Bot** -- chat-based color suggestions
