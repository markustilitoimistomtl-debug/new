# Uudet logot

Tämän kansion .lsp-tiedostot näkyvät LSP:ssä kohdassa **Templates → New logos**.

Uuden logon lisääminen:
1. Tee logo LSP:ssä ja anna sille nimi (**Canvas → Logo name**).
2. Tallenna se **Save .lsp** -napilla ja lisää tiedosto tähän kansioon.
3. Aja `python3 tools/build_new_logos.py`. Se päivittää tiedoston `lsp-new-logos.js`, josta ohjelma lukee listan.

## Joukkueiden logot

Nykyiset joukkueiden logot (35 kpl) on erotettu liigan uusimmista logokuvista ja muutettu muokattaviksi
(`node tools/make-current-logos.js`). Osalla joukkueista on useampi logo, ja ne on numeroitu
(esim. Baltimore Bigfeet 1 ja 2). Aiemmat ohjatulla toiminnolla tehdyt logot ovat kansiossa
`logos/arkisto/wizard-logot-2026-10/`.
