# Headway – Godot-versio

Ensimmäinen vaihe: leiri lähinäkymässä (AoE-tyyli). Mukana maasto ja vesistöt
North Coast 42 -kartasta, kiitorata, pienlentokone, kolme pelattavaa hahmoa ja
uudet puulajimallit (kuusi, sinikuusi, mänty, lehtikuusi, koivu, pihlaja, paju,
lehtipuu, pensaat) aurinkovarjoineen.

## Avaaminen

1. Lataa Godot 4.3 (tai uudempi 4.x) osoitteesta https://godotengine.org/download (Windows, "Godot Engine", ei .NET).
2. Pura zip ja käynnistä Godot. Valitse **Import** ja avaa kansion `project.godot`.
3. Paina **F5** (Run Project). Ensimmäinen avaus kestää hetken, kun Godot tuo tekstuurit.

## Ohjaus

- Klikkaus maastoon: aktiivinen hahmo kävelee (vedessä ui)
- Tab: seuraava hahmo
- WASD / nuolinäppäimet / ruudun reunat: liikuta näkymää
- Vasen veto: siirrä näkymää, oikea veto: kierrä ja kallista
- Q / E: käännä 45°, rulla: zoomaa, välilyönti: seuraa hahmoa, Esc: lopeta

## Windows-ohjelma (.exe)

Project → Export → Windows Desktop → Export Project. Ensimmäisellä kerralla
Godot pyytää lataamaan "export templates" (Editor → Manage Export Templates → Download).
Valmis ohjelma tulee kansioon `build/Headway.exe`.

## Rakenne

- `scripts/main.gd` – kokoaa kohtauksen: ympäristö, maasto, vesi, puut, kone, hahmot, kamera
- `scripts/forest.gd` – puulajien mallit (lehvästökortit) ja sijoittelu maastotyypin, korkeuden ja ryhmittymien mukaan
- `scripts/terrain.gd`, `shaders/terrain.gdshader` – maasto, maanpeite ja kiitorata
- `shaders/foliage.gdshader` – lehvästö (läpikuultavuus, tuuli, pehmeä latvan valaistus)
- `maps/north_coast_42/` – kartta valmiiksi käsiteltynä (tasatut vesistöt, kiitorata, leiri)
- `tools/make_foliage_textures.py` – tekee lehvästötekstuurit (`textures/`)
