# BlueLab customization invariants

BlueLab is a customized Mastodon distribution. Upstream Mastodon updates are inputs to BlueLab, not replacements for BlueLab behavior.

## Integration rule

When synchronizing a new Mastodon upstream version:

1. Start from the current `BlueLab` branch.
2. Merge or port upstream changes into an isolated integration branch.
3. Resolve conflicts by preserving BlueLab behavior unless the upstream change requires an adaptation for compatibility or safety.
4. Never resolve conflicts by replacing customized BlueLab files wholesale with their upstream versions.
5. Run the complete repository CI suite before integrating the update into `BlueLab`.
6. Only after validation, merge the integration branch into `BlueLab` so every instance updating from this branch receives both the new Mastodon version and all BlueLab customizations.

## Protected BlueLab behavior

The following behavior must survive upstream updates:

- The Bluesky-inspired BlueLab theme is the separate `blue-2` theme, currently entering through `styles/blue-2-v7.scss`; it must remain registered and selectable as **BlueLab**.
- The complete BlueLab 2.0 experience is protected, not only its SCSS entrypoint. This includes the `features/blue2` navigation, account menu, compose launcher, icons, right rail, scroll-to-top behavior, BlueLab single-column/mobile layout integration, and the BlueLab messages/direct-timeline presentation.
- When upstream replaces or renames a file used by BlueLab 2.0, port the BlueLab behavior to the new upstream component instead of restoring obsolete upstream files or dropping the customization.
- `mastodon-bird-ui-auto` is a separate legacy Bird UI option and must never be renamed to BlueLab or used as a replacement for the `blue-2` theme.
- Vanilla/default remains available alongside BlueLab and Bird UI.
- Signed-out visitors use the BlueLab custom `/overview` homepage by default, except when Trends or Local Feed is explicitly configured as the landing page.
- The BlueLab homepage keeps guest actions for account creation (when registrations are open), normal login, native passkey login, and the option to continue exploring without authentication.
- The public About experience keeps the intended BlueLab surfaces and must not render duplicated borders between adjacent blocks or between section wrappers, titles, and bodies.
- BlueLab compose redesign fixes, including mobile internal scrolling, media/ALT access, quote-card behavior, cursor/emoji behavior, safe-area handling, and prevention of background-column scrolling, must be preserved when compose files conflict.
- Existing BlueLab branding, limits, instance customization controls, menu/theme palette adjustments, username-display behavior, passkey additions, and other committed BlueLab features must not be removed merely to match upstream.

## Regression guards

Prefer executable regression tests for protected behavior. If an upstream update changes a guarded area, update the implementation and test together while preserving the intended BlueLab behavior.

A Mastodon version bump is not complete when an upstream snapshot is merely imported. It is complete only when the resulting `BlueLab` branch contains the upstream update plus the protected BlueLab behavior and passes validation.
