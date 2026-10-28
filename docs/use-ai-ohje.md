# Ohje: objektien tekeminen LSP:hen use.ai:lla

Tällä ohjeella use.ai (tai mikä tahansa kuvia tekevä tekoäly) tekee kuvia, jotka voi tuoda **LSP – Logo Styler Pictureen** suoraan muokattaviksi objekteiksi.

## Miten LSP ottaa objekteja vastaan

| Tapa | Mitä use.ai tekee | Mitä teet LSP:ssä | Tulos |
|---|---|---|---|
| **A. Kuva vektoriksi (suositus)** | PNG- tai JPG-kuvan, jossa on yksi objekti | **Art → Turn an image into vector art** | Värikerroksiksi jäljitetty vektoriobjekti. Värit, sävytys, ääriviivat, 3D-syvyys, varjot ja leikkaukset toimivat kuten kirjaston kuvissa. |
| B. Valmis .lsp-tiedosto | Tekstitekoäly kirjoittaa .lsp-tiedoston (JSON) | **Art → Add objects from a .lsp file** | Täysin muokattava vektoriobjekti. Toimii parhaiten yksinkertaisille muodoille. |
| C. Kuva sellaisenaan | JPG, PNG tai WebP | **Art → Import image as is** tai **Add image files to library** | Kuva kerroksena tai kuvakirjastossa. Tasainen tausta poistuu, kun **Remove plain background** on valittuna. Kuvaan toimivat kaksi ääriviivaa, väritys (**Image colors**), varjo, hehku, pikselöinti ja leikkaukset, joten logon voi koota pelkistä kuvista. |

Valmiin objektin tai koko logon voi tallentaa **kuvakirjastoon** (valitun objektin **Save to image library**, tai Art-välilehdeltä **Save whole logo to library**). Kirjastossa se on kuva, mutta ✎-napista saa takaisin muokattavan vektoriversion.

Tapa A tuottaa käytännössä parhaan tuloksen: kuvatekoäly piirtää hyvin, ja LSP muuttaa kuvan vektoreiksi. Mitä puhtaampi kuva on, sitä siistimpi vektori siitä tulee. Alla olevat kehotteet on kirjoitettu tätä varten.

---

## 1. Yleiskehote (liitä use.ai:hin ensin)

Kopioi tämä use.ai:hin keskustelun alkuun. Sen jälkeen voit pyytää objekteja yksi kerrallaan kohdan 2 listasta.

```
Teet minulle logo-objekteja, jotka tuon vektorointiohjelmaan. Noudata jokaisessa kuvassa näitä sääntöjä tarkasti:

1. Yksi objekti per kuva. Ei tekstiä, kirjaimia, numeroita, kehyksiä, kilpiä tai taustakuvioita, ellei pyydä niitä erikseen.
2. Tausta täysin tasainen puhdas valkoinen (#FFFFFF), mieluiten läpinäkyvä. Ei varjoa taustalle, ei liukuvärejä, ei tekstuuria taustassa.
3. Objekti keskellä ja kokonaan kuvassa. Se täyttää noin 80 % kuvasta, ja reunoille jää tyhjää tilaa. Mikään osa ei rajaudu kuvan reunan yli.
4. Neliökuva 1024 × 1024 px.
5. Tyyli: litteä vektorimainen urheilulogon kuvitus. Selkeät yhtenäiset värialueet, 4–8 väriä, paksu tumma ääriviiva koko objektin ympärillä ja selkeät sisäviivat. Ei valokuvamaisuutta, ei pehmeitä liukuvärejä, ei kohinaa, ei pieniä yksityiskohtia, jotka katoavat pienessä koossa.
6. Väreinä käytetään vain pyytämiäni värejä. Jos en anna värejä, käytä luonnollisia, kylläisiä värejä ja tummaa ääriviivaa (#14111F).
7. Objekti kuvataan suoraan edestä tai sivulta, ei vinosta perspektiivistä, jotta sitä voi kääntää ja peilata ohjelmassa.
8. Älä lisää palloa, maskottia tai muuta ylimääräistä objektiin, ellei pyydä. Teen yhdistelmät itse ohjelmassa.
9. Ei vesileimaa, allekirjoitusta tai tekstiä kulmissa.

Vahvista lyhyesti, että ymmärsit säännöt, ja odota ensimmäistä pyyntöäni.
```

**Pikselityyliin** (VBL-ikonit) vaihda sääntö 5 tähän:

```
5. Tyyli: 16-bittinen pikselitaideikoni (retro 1990-luvun peli). Suuret selkeät pikselit, noin 48–64 pikseliä leveä ikoni suurennettuna, 6–12 väriä, tumma 1 pikselin ääriviiva ja vaalea 1 pikselin reunus sen ulkopuolella. Ei sumeutta eikä antialiasointia.
```

---

## 2. Objektipyynnöt (yksi kerrallaan)

Pyydä muodossa: **"Tee objekti: [kuvaus]. Värit: [värit]."** Alla ovat kaikki liitekuvissa esiintyvät objektit erillisinä. Ne kannattaa tehdä erikseen, jotta niitä voi yhdistellä LSP:ssä vapaasti.

**VBL-liiga**
- ristikkäiset sepänvasarat (siniset päät, puiset varret)
- puinen veneen runko edestä
- kahdeksankulmainen violetti jalokivi, jossa koripallon saumat
- bulldoggin pää vihreällä knallihatulla
- tuulimylly, jossa neljä sinistä siipeä ja puinen torni
- istuva punainen majava (ilman palloa)
- juokseva kettu sivulta
- tummanpunainen sudenpää edestä, avoin suu
- liekehtivä koripallo ja kultaiset vauhtiviivat
- teräksinen hammasratas (keskusta tyhjä)
- hehkulamppu (lasi tyhjä)
- kotkan kynsi, punainen, valkoiset kynnet
- kitaraplektra, jossa kitaran kielet
- pronssinen antiikin soturin rintakuva jalustalla
- manaatti sivulta
- koripallokori ja verkko
- St. Louisin kaari
- härän kallo pitkillä sarvilla
- luotijuna sivulta vauhtiviivoineen
- öljytorni ja öljysuihku
- kaksi ristikkäistä lippua (valkoinen ja punainen)
- skorpioni ylhäältä
- saguarokaktus
- lautta sivulta aaltojen päällä
- kuusi
- hirven pää edestä
- lentävä hawaijinhanhi (nene)
- merileijona, nenällä tasapainoilu-asento
- kuumailmapallo, punainen-keltainen-sininen
- koripallo (oranssi, mustat saumat)

**Konseptit**
- bigfootin pää edestä, violetti
- bigfoot seisomassa, koko vartalo
- iso jalanjälki (varpaat erillisinä)
- riippusilta (kaksi tornia ja kaapelit)
- kolme kynnenjälkeä (raapaisu)
- kotkan pää sivulta, punainen
- kertakäyttömuki pillillä (tumbler)
- kaareva vauhtiviiva (swoosh)
- sokerikallo kukkakoristein
- Seattlen Space Needle -torni
- vuorijono lumihuippuineen
- kaivosmies kypärä päässä (puolivartalo)
- hakku
- lapio
- kaivoskypärä lampulla
- kaksi ristikkäistä hakkua

**Kirjaimet ja tekstit** tehdään LSP:ssä fonteilla (Text-välilehti), joten niitä ei kannata pyytää kuvina.

---

## 3. Valmiin logon purkaminen osiin

Jos haluat erottaa osat jostain valmiista logosta (esimerkiksi majavan ja pallon), liitä logo use.ai:hin ja kirjoita:

```
Tämä on valmis logo. Erittele siitä jokainen kuva-aihe omaksi kuvakseen yleisohjeen säännöillä: yksi objekti per kuva, valkoinen tausta, ei tekstiä. Piirrä osat kokonaisina myös niistä kohdista, jotka toinen objekti peittää. Säilytä alkuperäiset värit ja tyyli. Luettele ensin, mitkä objektit löysit, ja tee sitten kuvat yksi kerrallaan.
```

---

## 4. Kehote tekstitekoälylle: suoraan .lsp-tiedosto (tapa B)

Tämä sopii yksinkertaisille muodoille, kuten tunnuksille, kilville, salamoille, nuolille ja tähdille. Monimutkaisiin hahmoihin käytä tapaa A.

```
Kirjoita LSP-logo-ohjelmaan tiedosto (.lsp, JSON) ilman selityksiä. Rakenne:

{
  "format": "LSP", "version": 1, "name": "<objektin nimi>",
  "canvas": { "bg": "none" },
  "layers": [
    { "type": "clip", "name": "<nimi>", "x": 500, "y": 500, "sx": 2.5, "sy": 2.5,
      "p": { "art": {
        "n": "<nimi>",
        "d": "<objektin ulkomuoto SVG-polkuna>",
        "dd": "<valinnainen: yksityiskohtien täyttöalueet, värinä Detail color>",
        "d2": "<valinnainen: toisen yksityiskohtavärin alueet>",
        "ds": "<valinnainen: viivat, piirretään viivoina>",
        "parts": [["#rrggbb", "<polku>"], ["#rrggbb", "<polku>"]]
      } },
      "s": { "fill": "solid", "c1": "#rrggbb", "o1c": "#14111f", "o1w": 4 } }
  ]
}

Säännöt:
- Polkujen koordinaatit ovat alueella -100…100, ja keskipiste on 0,0. y kasvaa alaspäin.
- Käytä vain absoluuttisia komentoja M, L, C, Q ja Z sekä numeroita. Ei kaaria, ei transform-määrityksiä, ei muita merkkejä.
- "d" on koko objektin yhtenäinen ulkomuoto. Siihen ohjelma piirtää täytön, ääriviivat ja 3D-syvyyden.
- "parts" on valinnainen värikerroslista alhaalta ylöspäin. Ensimmäinen kerros kattaa koko muodon, ja seuraavat piirretään sen päälle.
- Yksi kerros voi sisältää useita alipolkuja (M…Z M…Z).
- Värit muodossa #rrggbb.
Tee objekti: <kuvaus ja värit>
```

Tallenna vastaus tiedostoksi, jonka pääte on `.lsp`, ja lisää se LSP:ssä kohdasta **Art → Add objects from a .lsp file**.

---

## 5. Tuonti LSP:hen

1. Tallenna use.ai:n kuva koneelle (PNG on paras, JPG käy).
2. Avaa LSP ja valitse **Art → Turn an image into vector art**. Tasainen tausta poistuu automaattisesti.
3. Objekti tulee kankaalle alkuperäisillä väreillä. Oikealla kohdassa **Content → Colors** voit valita:
   - **Original colors**: kuvan omat värit
   - **Shaded with fill color**: varjostukset säilyvät, mutta pääväri tulee Fill-osion väristä tai liukuväristä
   - **Fill color only**: pelkkä siluetti täyttövärillä, esimerkiksi ääriviivalogoihin
4. Lisää ääriviivat, 3D-syvyys, varjo, kiilto, graffitisuihke tai pikselöinti kuten muihinkin objekteihin.
5. Tallenna **Save .lsp**. Kaikki pysyy muokattavana.

## Laatuvinkit

- Mitä isompi ja selkeämpi kuva, sitä siistimmät vektorit. 1024 px riittää hyvin.
- Pyydä 4–8 väriä. Liukuvärit ja varjostukset muuttuvat jäljityksessä porrasmaisiksi värialueiksi.
- Jos taustasta jää roskia, pyydä use.ai:ta tekemään kuva uudelleen puhtaalla valkoisella taustalla.
- Jos objekti on liian monimutkainen, pyydä yksinkertaistettua versiota: "Tee sama yksinkertaisempana, isommat muodot, vähemmän yksityiskohtia, paksumpi ääriviiva."
