# Vintage Basket – ohjeet Claude Codelle

## Projekti
- Retro 16-bit -koripallopeli selaimessa. Koko peli on index.html (HTML + JavaScript).
- Sama index.html paketoidaan Win-versioksi ja itch.io-versioksi.
- Ei Godotia. Ei kuvien pikselikorjailua.

## Kansiot
- index.html            peli
- vintage-builder.html  apuohjelma (älä muuta ellei pyydetä)
- sprites/              pelin kuvat (sheetit .webp + vb_sprites.json)
- tools/moves_render/   Blender-renderöintiputki (moves_render.py, make_game_assets.py, tint.py, measure.py)
- renders/ ja muut välikansiot: .gitignore, ei commitoida

## Työtapa
- Tee vain pyydetty muutos. Älä muuta pelilogiikkaa, kenttää, valikoita, joukkueita tai ääniä ilman pyyntöä.
- Jokainen tehtävä omaan haaraan, jokainen toimiva askel omaksi commitiksi suomenkielisellä viestillä.
- Pull request vaiheen lopuksi. Älä yhdistä main-haaraan ilman hyväksyntää.
- Kuvavirhe korjataan renderöintiputkeen ja kuvat renderöidään uudelleen. Valmiita kuvia ei muokata käsin.
- Testaa ensin pienellä (yksi liike, muutama ruutu). Koko sarja (n. 1 h) ajetaan taustalle.
- Testaa selaimessa repon kansiosta. Win/itch-paketit vain kun pyydetään.
- Näytä todisteet ennen kuin sanot valmis: kuvakaappaukset ja kontaktiarkit muutetuista liikkeistä.
- Jos hyväksymisehto ei täyty, pysähdy ja kerro. Älä keksi kiertotietä.
- Jos jokin hajoaa, palaa edelliseen committiin.

## Loki
- Kirjaa jokaisesta versiosta: pohja (commit), tavoite, mitä ei muutettu, tehty, tarkistettu, tunnetut ongelmat, tiedostot.
