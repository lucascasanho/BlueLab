# BLUE 2.0

BLUE 2.0 is an optional BlueLab theme for Mastodon inspired by the visual hierarchy of the Bluesky Social application.

## Goals

- Keep BlueLab/Mastodon functionality intact.
- Provide a white light mode and a true-black dark mode.
- Use a Bluesky-like blue accent, compact navigation, subtle borders, rounded controls, and a ~600px primary feed column on desktop.
- Keep the theme isolated from the default and Bird UI themes so upstream Mastodon updates can be merged without replacing the current production theme.
- Do not include Bluesky logos or present BlueLab as Bluesky.

## Upstream visual reference

Visual references were taken from `bluesky-social/social-app`, including its public theme palette and desktop layout dimensions. The upstream project is distributed under the MIT License (Copyright 2023–2026 Bluesky Social PBC). The BLUE 2.0 stylesheet itself is an original Mastodon adaptation rather than a verbatim copy of the Bluesky application UI code.

Reference repository: `https://github.com/bluesky-social/social-app`

## Current implementation

Theme registration: `config/themes.yml`

Main stylesheet: `app/javascript/styles/blue-2.scss`

Theme key: `blue-2`

Display label: `BLUE 2.0`

The theme follows Mastodon's existing `web.color_scheme` preference. Light uses a white background and dark uses a black background. Mastodon's automatic option follows the operating system preference. There is no separate Bluesky-style dim palette.

## Updating

When syncing BlueLab with Mastodon upstream, keep `blue-2` as an independent theme. Resolve upstream selector changes inside `blue-2.scss` rather than modifying the default Mastodon theme solely for BLUE 2.0.
