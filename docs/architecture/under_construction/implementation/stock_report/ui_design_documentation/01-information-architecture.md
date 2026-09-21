# 01 — Information Architecture

## Domain concepts visible in the UI

| Concept | How the UI shows it |
|---------|--------------------|
| **Stock need** | One card in the list; one page in detail. Represents a quantity goal. |
| **Item type** | Furniture type (chair, table, sideboard) — shown as a geometric icon and carried in the need title ("Dining chair", "Café table", "Low sideboard"). |
| **Descriptive properties** | Wood type and shape/config, shown as small grey tags ("Oak", "Spindle back", "Beech", "Round", "Three-door"). |
| **Required quantity** | Large number + "pc" in the left panel of the card / summary header. |
| **Fulfilled quantity** | Blue segment of the fulfilment bar, labelled with its number. |
| **In-progress quantity** | Amber segment of the fulfilment bar, labelled with its number. |
| **Remaining quantity** | Grey remainder of the bar, labelled with its number. Derived: `required − fulfilled − in progress`, floored at 0. |
| **Priority** | Not shown on the card at all. It is expressed **only** by the segmented control at the top: the list shows one priority bucket at a time. `Unset` = needs with no priority assigned. |
| **Manual order** | Card order within the visible bucket; user-controlled by drag. |
| **Selected item (task)** | One card in the detail item list: code, quantity, source, date, status. |

## Screen 1 — Stock need list

**Purpose.** Let the manager work one priority bucket at a time and decide the sequence within it.

**Information presented**, in descending emphasis:

1. **Required quantity** (largest numeral on the card) — the goal.
2. **Need title** (furniture type / model name).
3. **Descriptive properties** (tags) — disambiguate two needs of the same type.
4. **Fulfilment bar with three numbers** — progress toward the goal.
5. **Drag handle** — affordance, lowest emphasis.

**Deliberately absent:** priority label on the card (redundant with the filter), item-type word, per-card
actions, aggregate totals. Earlier iterations had a page title, a "units short" total, priority group
headers and a property-chip filter row; all were removed. Do not reintroduce them.

**Grouping.** Flat list. No group headers. The segmented control *is* the grouping mechanism.

**Navigation.** Card → stock need detail. No other navigation exits this screen.

**Actions available:** switch priority bucket, type a search query, (inert) sort, (inert) filter,
drag to reorder within the bucket, open a card.

## Screen 2 — Stock need detail

**Purpose.** Answer two questions: *how far is this need from its goal* and *which items are carrying it*.

**Information presented**, in descending emphasis:

1. **Page title** = furniture type — the identity of the need, at the top, so the summary card does not
   repeat it.
2. **Summary card**: required quantity (large), properties, the three-value fulfilment bar, and a legend
   naming the three colours.
3. **Add item** — the single primary-intent action, placed immediately under the summary because it is the
   answer to a shortfall. Styled low-contrast so it does not outweigh the data.
4. **"Selected items" + count** — section boundary.
5. **Item cards** — code (largest text in the card), status, source, date/due, quantity badge over the photo.

**Information hierarchy inside an item card.** The code identifies, the status pill qualifies, the source
and date are secondary metadata at equal weight, the quantity badge is anchored to the photo because it
answers "how many does *this* item contribute".

**Navigation.** Back arrow → list. Overflow menu (⋮) → per-item actions (not designed). Item card tap
target → item detail is **not** specified.

**Actions available:** go back, add item, open per-item overflow menu.

## Relationship between the two screens

The detail summary card is intentionally the **same anatomy** as a list card (quantity panel on the left,
properties + bar on the right), promoted to header scale: larger numerals, taller bar, a legend added,
and the title lifted out into the page title. This is a designed continuity — keep it.
