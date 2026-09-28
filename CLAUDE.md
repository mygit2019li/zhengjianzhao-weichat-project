# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeChat Mini Program (微信小程序) — a multi-function photo editing tool. The main features are ID photo creation with background replacement, photo collage/puzzle, nine-grid cutting, image watermarking, compression, format conversion, moments copywriting templates, and textbook cover generation.

- **AppID**: `wx2839e4f9b66968f0`
- **Backend API**: `https://api.zjzxcx.top` (base), `https://api.zjzxcx.top/py` (python services)
- **Dev tools**: WeChat Developer Tools (微信开发者工具) — open this repo as a miniprogram project

## Build & Development

There is no build step — this is a raw WeChat Mini Program. Open the project root in WeChat Developer Tools, which handles ES6→ES5 transpilation and PostCSS. The `package.json` exists only to declare the `qrcode` npm dependency; the `scripts` are not functional.

```bash
# Install npm dependencies (for qrcode package used in some pages)
npm install
```

In WeChat Developer Tools: Tools → Build npm after `npm install`.

## Architecture

### Page Structure

The **tab bar** has 3 tabs: 首页 (`pages/index/index`), 朋友圈文案 (`pages/moments-copy/index`), 我的 (`pages/my/index`).

**Core feature pages** (most complex, most frequently edited):

| Page | Purpose |
|---|---|
| `pages/idphoto/index` | ID photo creation — upload, crop, select size/color, matting API, layout printing |
| `pages/pintu/index` | Multi-image puzzle/collage with layout modes, drag-to-reorder, text overlay |
| `pages/jiugongge/index` | Nine-grid photo cutting with shape masks (circle, heart, bear, flower) |
| `pages/grid-cut/index` | Grid-based image slicing |
| `pages/image-editor/index` | Remove background / change background color |
| `pages/image-edit/index` | Add text/watermark to images |
| `pages/image-crop/index` | Image cropping |
| `pages/long-puzzle/index` | Long image stitching (vertical/horizontal) |
| `pages/subtitle-puzzle/index` | "Chat-style" subtitle/screenshot stitching |
| `pages/moments-copy/index` | Browse/copy WeChat Moments copywriting templates |
| `pages/compress/index` | Image compression |
| `pages/convert/index` | Image format conversion (PNG↔JPG) |
| `pages/custom-size/index` | Custom ID photo dimensions |
| `pages/birthday-calendar/index` | Birthday calendar generator |
| `pages/login/index` | Login page |
| `pages/webview/index` | WebView wrapper for external URLs |

**Sub-packages** (lazy-loaded): `pages/textbook/`, `pages/id-watermark/`

### Shared Utilities (`utils/`)

- **`request.js`** — HTTP wrapper around `wx.request`. Expects `{ code: 0 }` for success. Uses `goapiUrl` (Go backend) as base URL. Import via `const { request, BASE_URL } = require('../../utils/request')`.
- **`security.js`** — HMAC-SHA256 signature generation + AES-ECB encryption for API request payloads. Used by the ID photo and NSFW APIs. Relies on vendored `crypto-js.js` (~48KB).
- **`nsfw.js`** — NSFW image content detection. Reads image as base64, sends to `/py/nsfw_check` with encrypted payload. Pages call `NSFW.checkAndAlert(filePath, true)` before processing user images.
- **`image-processor.js`** — Canvas-based background color compositing for ID photos. Manages color presets (`ID_PHOTO_COLORS`) including solid colors and gradients (海马体 style). Handles base64↔temp file conversion for canvas operations.
- **`shapes.js`** — SVG path definitions for nine-grid cut shape masks (circle, bear, heart, flower).
- **`puzzle/layout.js`** — Layout geometry calculation engine for the puzzle page. Computes cell positions for 1-9+ images with fixed-ratio and original-ratio modes, supporting many layout variants per image count.
- **`puzzle/render-model.js`** — Builds preview/export render models for the puzzle canvas, including border calculations.
- **`util.js`** — Image file size validation helper.
- **`timeUtil.js`** — Time formatting utility.

### Components

- **`components/add-tips/`** — "Add to My Apps" tip bubble that appears after a delay.

### API Communication Pattern

Pages that call APIs use `Security.getSecurityHeaders()` + `Security.encryptData()` to wrap request payloads. The Go backend validates signatures and decrypts. The Python backend (`apiUrl`, ending in `/py`) handles ID photo matting and NSFW detection.

The request flow for ID photo creation:
1. Upload image via `wx.uploadFile` to `/py/idphoto` with encrypted form data
2. API returns base64 PNG with transparent background
3. Client composites background color locally using `OffscreenCanvas` via `compositeBackground()`
4. Layout printing is also done client-side via canvas

### Monetization

Rewarded video ads are integrated on ID photo and jiugongge pages. The pattern: set `this.pendingXxx` state, show ad via `this.videoAd.show()`, then execute the action in `onClose` callback when `res.isEnded` is true. Ad unit IDs are hardcoded per page.

### Fonts

Custom fonts (Playfair Display, HYChengXingJian, HYZhongSongJian, huaguangmaotixingkai) are loaded from `https://api.zjzxcx.top/font/` via `App.loadGlobalFonts()`. Supports "lite" (subset) and "full" font variants for performance.

### Global Data (`app.js`)

- `globalData.apiUrl` — Python backend URL
- `globalData.goapiUrl` — Go backend URL
- `globalData.fontUrl` — Font CDN URL
- `globalData.ColorList` — Shared color palette used across pages
- `globalData.appId` / `globalData.apiSecretKey` — API authentication credentials
- `globalData.StatusBar` / `globalData.CustomBar` — Layout measurements for custom navigation bar

## Development Notes

- Each page is a directory containing `index.js`, `index.wxml`, `index.wxss`, `index.json`. The `app.json` `pages` array registers all pages.
- Canvas operations use both the legacy `wx.createCanvasContext('canvasId', this)` API (jiugongge, pintu) and the newer `wx.createOffscreenCanvas()` API (image-processor). Be consistent with whichever pattern a given page already uses.
- Image paths from `wx.chooseImage` return temporary file paths (`wxfile://` or `http://tmp/`). Base64 data URLs are used when passing API results around. Use `base64ToTempFile()` from image-processor to convert for canvas rendering.
- Login state is stored in `wx.getStorageSync('isLogin')` and `wx.getStorageSync('userInfo')` — there's no real auth, just local storage simulation.
- The project uses both `wx.chooseImage` (older API) and `wx.chooseMedia` (newer API) — both are valid. Prefer whichever the surrounding code uses.
- Event channels (`eventChannel.emit('acceptDataFromOpenerPage', data)`) are used to pass data between pages during navigation (e.g., index → pintu, index → grid-cut).
