# Vintage Builder – ohje

Vintage Builder (`vintage-builder.html`) on erillinen ohjelma, jolla valitaan Vintage Basket -pelin
musiikki, logot, peliasut ja selostukset. Muutokset tallennetaan setup-tiedostoon `vintage.vbf`,
jonka peli lukee käynnistyessään.

## Käyttö

1. Avaa `vintage-builder.html` selaimessa (Chrome, Edge tai Firefox).
2. Valitse **OPEN GAME FILE** ja avaa pelin `index.html`. Builder lukee siitä nykyiset äänet, logot ja joukkueet.
3. Käy osiot läpi vasemmasta valikosta:
   - **Teams, logos & kits**: nimet, lyhenteet, värit, koti- ja vierasasut sekä logot
   - **Music**: ottelun alun pitkät kappaleet ja taukomusiikki
   - **Team names & intros**: miten selostajat sanovat joukkueen nimen, ja kotikaupungin esittelyt
   - **Game situations**: Tonyn ja Jenin tilannekommentit
   - **Play-by-play**: lyhyet pelitilannehuudot
   - **Players & moments**: virheet, varoitukset, virstanpylväät, kuuluttaja
   - **Player names & numbers**: pelaajien nimet ja numerot
   - **Crowd & arena sounds** ja **Home-arena horns**
4. Jokaisella rivillä on **Play**, **Delete** ja **Import**. Import vaihtaa äänen omaan mp3-tiedostoon.
   **+ Add a line** lisää uuden lauseen tilanteeseen. Kun tilanteessa on useita lauseita, peli arpoo yhden.
5. Palaa **Start**-sivulle ja valitse **SAVE SETUP (.VBF)**. Siirrä `vintage.vbf` samaan kansioon pelin
   `index.html`-tiedoston kanssa. Jos selain nimesi tiedoston uudelleen (esim. `vintage(1).vbf`), korjaa nimi.

## Lauseiden merkinnät

Kirjoita uuteen lauseeseen merkit niihin kohtiin, joissa peli sanoo nimen:

| Merkki | Tarkoittaa |
|---|---|
| X | joukkue, josta lause kertoo |
| Y | toinen joukkue |
| P | pelaaja |
| # | numero (esim. pisteet) |

Esimerkki: `X needs to speed up their offense if they want to get a victory tonight`.
Peli sanoo ensin joukkueen nimen ja sitten äänitteen.

- Joukkueen nimi sanotaan joko kaupunkina tai nimenä. Kaupunki + nimi kokonaan vain 1. erässä, kerran kolmesta.
- Jos nimi on lauseen keskellä, kirjoita **cut s** -kenttään kohta sekunteina, johon nimi tulee.
- Play-nappi arpoo joukkueen ja pelaajan ja soittaa lauseen niin kuin peli sen soittaisi.

## Suositellut koot

| Mikä | Pituus / koko |
|---|---|
| Joukkueen ja pelaajan nimi | 0,3–1,6 s |
| Play-by-play | 0,6–3,2 s |
| Virheet ja hetket | 1,2–4,5 s |
| Tilannekommentit | 2–8 s |
| Kotikaupungin esittely | 3–10 s |
| Ottelun alun musiikki | 30–180 s (peli häivyttää 40 s kohdalla) |
| Taukomusiikki | 8–45 s |
| Logot | neliö, läpinäkyvä tausta, vähintään 256 × 256 px |

Liian pitkät tai lyhyet äänet näkyvät builderissa keltaisina.

## Uusi nimi joukkueelle

Kun joukkue saa uuden nimen, tuo **Team names & intros** -sivulla sille uudet äänet: kaupunki, nimi,
kaupunki + nimi (Tony) ja kaupunki + nimi (Jeni). Siihen asti peli sanoo vain kaupungin. Jos myös
kaupunki vaihtui, peli ei sano nimeä lainkaan.

## Lopuksi

Kun kaikki on paikallaan, tuo `vintage.vbf` Claudelle tarkistettavaksi. Claude kuuntelee, että jokainen
ääni leikkautuu peliin oikein, ja korjaa ne, jotka eivät sovi suoraan.
