# Uudet logot

Tämän kansion .lsp-tiedostot näkyvät LSP:ssä kohdassa **Templates → New logos**.

Uuden logon lisääminen:
1. Tee logo LSP:ssä ja anna sille nimi (**Canvas → Logo name**).
2. Tallenna se **Save .lsp** -napilla ja lisää tiedosto tähän kansioon.
3. Aja `python3 tools/build_new_logos.py`. Se päivittää tiedoston `lsp-new-logos.js`, josta ohjelma lukee listan.
