# FireBird

FireBird is a standalone BlueLab theme that recreates the visual language of the historical Twitter web/mobile interface from the 2019-2022 period, while keeping Mastodon/BlueLab application behavior and data intact.

## Implementation scope

- Theme registration: `config/themes.yml`
- Main presentation: `app/javascript/styles/firebird.scss`
- Dedicated responsive shell: `app/javascript/mastodon/features/ui/components/columns_area/redesign.tsx`
- FireBird desktop shell styles: `redesign.module.scss`
- TweetDeck-style advanced layout: `redesign_multicol.module.scss`
- FireBird mobile navigation: `mobile_nav.module.scss` and `navigation_link.module.scss`
- Instance branding: `navigation_panel/redesign/header.tsx`
- Existing BlueLab composer behavior is reused; the FireBird layer changes presentation rather than composer state/actions.

## Visual references and credits

The theme is an independent implementation. It does not copy Twitter's proprietary source repository.

1. Twitter, "Apresentando um novo Twitter.com", 15 July 2019:
   https://blog.x.com/pt_br/topics/product/2019/apresentando-um-novo-twitter-com
   Used as a primary reference for the 2019 web redesign and its desktop navigation model.

2. TechCrunch, "Twitter tests out another desktop redesign with trends on the right, navigation on the left", 26 June 2019:
   https://techcrunch.com/2019/06/26/twitter-tests-out-another-desktop-redesign-with-trends-on-the-right-navigation-on-the-left/
   Used as a reference for the three-column desktop composition.

3. katabame, "bring back old tweetdeck style", GitHub Gist, 19 May 2019:
   https://gist.github.com/katabame/10f79375fcc6f07fcf3fca56b0a348dc
   Used as a historical reference for TweetDeck column sizing and deck-style composition.

4. xecua, "Custom CSS for BetterTweetDeck", GitHub Gist, last active 5 June 2019:
   https://gist.github.com/xecua/c6c18b193c10d6c0439e21557c0fbe5e
   Used as a historical reference for TweetDeck drawers and column presentation.

5. dimdenGD, "OldTweetDeck", GitHub:
   https://github.com/dimdenGD/OldTweetDeck
   MIT-licensed project used as a reference for the preserved old TweetDeck interaction/layout model. FireBird does not import its source files.

6. Historical Twitter HTML capture, hcmus-internet-banking/frontend:
   https://github.com/hcmus-internet-banking/frontend/blob/main/response.html
   Preserves a real Twitter web response and real `client-web-legacy` asset references from 2022.

7. Historical Twitter HTML capture, phonedude/cs595-s21:
   https://github.com/phonedude/cs595-s21/blob/4ae11887b9f869a914bcff83fbfebf7399374b47/assignments/Tillman/3/data/twitter.com.txt
   Used to cross-check the historical web markup/bundling model.

## Notes

FireBird is intentionally gated by `body[data-theme='firebird']`. The goal is to prevent visual selectors or shell changes from affecting Default, Bird UI, or BlueLab themes.

The instance logo/name comes from the installed instance branding exposed by BlueLab/Mastodon. No Twitter logo is used as the site's brand.
