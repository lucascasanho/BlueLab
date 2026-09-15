from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"{path}: expected text not found: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# The BlueLab favorite renderer chooses Star/Heart directly, so alpha.3's
# useIconWeight helper import is redundant here; iconWeight is still used.
replace(
    "app/javascript/mastodon/components/status/action_bar.tsx",
    "import { iconWeight, useIconWeight } from '../icon';",
    "import { iconWeight } from '../icon';",
)

# Preserve BlueLab autofocus on the dedicated /publish composer while making
# the existing accessibility exception explicit to ESLint.
replace(
    "app/javascript/mastodon/features/compose/index.tsx",
    "          <RedesignComposeForm autoFocus embedded />",
    "          <RedesignComposeForm\n"
    "            // This is a dedicated compose view.\n"
    "            // eslint-disable-next-line jsx-a11y/no-autofocus\n"
    "            autoFocus\n"
    "            embedded\n"
    "          />",
)

# Preserve BlueLab's modal scroll/focus lock on top of alpha.3's new
# multi-column shell instead of discarding isModalOpen as unused.
replace(
    "app/javascript/mastodon/features/ui/components/columns_area/redesign.tsx",
    "  return (\n"
    "    <main ref={ref} className={multiColClasses.root}>\n",
    "  return (\n"
    "    <main\n"
    "      ref={ref}\n"
    "      className={classNames(multiColClasses.root, { unscrollable: isModalOpen })}\n"
    "      tabIndex={isModalOpen ? undefined : 0}\n"
    "    >\n",
)
