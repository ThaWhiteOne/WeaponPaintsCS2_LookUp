# WeaponPaints CS2 Lookup

A fast, browser-based lookup tool for CS2 weapon skin codes — built for server owners and plugin developers who use [WeaponPaints]([https://github.com/Skapt/CS2-WeaponPaints](https://github.com/Nereziel/cs2-WeaponPaints) and similar plugins.

**[Live Demo →](https://YOUR-USERNAME.github.io/weaponpaints)**

---

## What it does

Lets you instantly find the numeric codes you need to configure CS2 server plugins:

| Tab | What you look up | Code you get |
|---|---|---|
| **Skins** | Weapon skins by name or weapon type | `weapon_defindex` + `paint_index` |
| **Agents** | Player agent skins | `def_index` |
| **Keychains** | Weapon charms | `def_index` |
| **Stickers** | Stickers | `sticker_id` |
| **Music Kits** | Music kits | `music_kit_id` |

Every result card shows a ready-to-paste JSON entry in the exact format the WeaponPaints plugin expects. Click any code to copy it instantly.

---

## Features

- **Always up to date** — data is fetched live from [ByMykel's CSGO-API](https://github.com/ByMykel/CSGO-API), so new skins appear automatically whenever Valve releases them
- **Browse All** — load the full database without searching
- **Weapon filters** — quickly filter by AK-47, AWP, Knives, Gloves, and every other weapon
- **Click to copy** — click any code value to copy it to your clipboard
- **Plugin JSON** — expand any card to get a complete, copy-pasteable JSON entry
- **Float range** — min/max float displayed on every skin card
- **StatTrak™ & Souvenir** indicators
- **No install, no backend** — pure HTML/CSS/JS, works from any static host

---

## Usage

### Online (recommended)

Just visit the live site — no setup needed.

### Run locally

Clone the repo and open `index.html` in your browser:

```bash
git clone https://github.com/YOUR-USERNAME/weaponpaints.git
cd weaponpaints
```

Then open `index.html`. If your browser blocks cross-origin requests from `file://`, the site automatically falls back to a CORS proxy — no configuration needed.

> **Tip:** For the best local experience, serve it with any static server:
> ```bash
> # Python
> python -m http.server 8080
>
> # Node
> npx serve .
> ```

---

## Plugin config example

After finding your skin, expand the card and copy the JSON entry directly into your plugin config:

```json
{
    "weapon_defindex": 7,
    "weapon_name": "weapon_ak47",
    "paint": 344,
    "image": "https://...",
    "paint_name": "AK-47 | The Empress",
    "legacy_model": false
},
```

---

## Data source

All item data is provided by **[ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API)** — a community-maintained, always-updated CS2 item database. This project uses it as a read-only data source with no modifications.

---

## Deploy to GitHub Pages

1. Fork or push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **`main` branch**, folder **`/ (root)`**
4. Your site will be live at `https://YOUR-USERNAME.github.io/REPO-NAME`

---

## Contributing

Pull requests are welcome. If you find a missing weapon, incorrect defindex, or want to add a feature, open an issue or PR.

---

## License

MIT — free to use, modify, and host.
