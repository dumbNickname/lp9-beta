# Buying the domain

Owner guide. Name shortlist and ranking: `DESIGN.md` §14j.

## Three kinds of "available"

- **Free, standard price.** Nobody owns it. Any registrar sells it at
  list price (`.com` ~34 PLN first year at OVH, ~62 PLN renewal).
- **Registry premium.** Free, but the registry itself charges more for
  short or dictionary words (common on `.app`, `.page`, `.love`). Price
  shows in the cart; renewals may stay high. Check renewal before paying.
- **Aftermarket / "premium" with no price.** Someone already owns it
  and resells it through a broker (Afternic, Sedo, Dan.com). GoDaddy
  owns Afternic, so it shows these as "premium". Price is whatever the
  owner asks, often hundreds to thousands of USD. Not a normal purchase.

## How to tell

- Registry lookup (RDAP): `https://rdap.verisign.com/com/v1/domain/<name>.com`.
  404 = free. A record with name servers such as `afternic.com` or
  `sedo` = held by a reseller.
- Same name, different price across registrars = registry premium.
  Price only on GoDaddy / "make offer" = aftermarket.

## Where to buy (pay in PLN)

- **OVH** (`ovhcloud.com/pl`): Polish entity, PLN, VAT invoice. Prices
  include promos; compare the renewal column.
- Polish registrars also work: nazwa.pl, home.pl, cyber_Folks. Watch
  for cheap first year, expensive renewal (`.pl` often 5-20 PLN, then
  50-150 PLN).
- International, cheaper renewals, pay by card (bank converts): Porkbun
  (`.com` ~11 USD/yr flat), Cloudflare Registrar (at cost, needs a
  Cloudflare account). Fine legally for a PL individual; invoice is not
  Polish.
- Avoid GoDaddy for the purchase: upsells, high renewals.

## Checklist

1. Re-check the name is free (RDAP link above).
2. Put it in the cart; read first-year and renewal price, VAT included.
3. Turn on WHOIS privacy (usually free; `.pl` hides private persons by
   default) and auto-renew.
4. Buy 1 year; extend later. Register the `.pl` too for the PL market.
5. Do not register anything you only "might" use; each name renews yearly.

## Aftermarket (only if you must have a taken name)

- Broker page shows "Buy now" or "Make offer". Offer low; expect counters.
- Pay only through the broker's escrow, never directly to a seller.
- Usually not worth it for a side project: pick a free variant instead.
