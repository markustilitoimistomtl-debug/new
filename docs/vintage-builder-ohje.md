# Vintage Builder – ohje

Vintage Builder (`vintage-builder.html`) on erillinen ohjelma, jolla valitaan Vintage Basket -pelin
musiikki, logot, peliasut ja selostukset. Muutokset tallennetaan setup-tiedostoon `vintage.vbf`,
jonka peli lukee käynnistyessään.

## Käyttö

1. Avaa `vintage-builder.html` selaimessa (Chrome, Edge tai Firefox).
2. Valitse **OPEN GAME FOLDER** ja valitse kansio, jossa pelin `index.html` on (Chrome ja Edge). Builder lukee pelin
   ja kansiossa jo olevan `vintage.vbf`-setupin. Firefoxissa valitse **OPEN GAME FILE** ja avaa `index.html`.
3. Käy osiot läpi vasemmasta valikosta:
   - **Look & layout**: pelin yleisilme 20 teemasta (värit ja fontit), paneelien tekstikoot ja tip off -kortin logot
   - **Teams, logos & kits**: nimet, lyhenteet, värit, koti- ja vierasasut sekä logot
   - **Music**: jokaiselle kappaleelle valitaan, missä se soi: ottelun alku (Tip-off), aikalisät ja erätauot (Breaks),
     lopputulokset (Final results) ja valikot (Menus). Kappaleen voi siirtää mihin vain tai useaan kohtaan.
   - **Team names & intros**: miten selostajat sanovat joukkueen nimen, ja kotikaupungin esittelyt
   - **Game situations**: Tonyn ja Jenin tilannekommentit
   - **Play-by-play**: lyhyet pelitilannehuudot
   - **Players & moments**: virheet, varoitukset, virstanpylväät, kuuluttaja
   - **Player names & numbers**: pelaajien nimet ja numerot
   - **Crowd & arena sounds** ja **Home-arena horns**
4. Jokaisella rivillä on **Play**, **Delete** ja **Import**. Import vaihtaa äänen omaan mp3-tiedostoon.
   **+ Add a line** lisää uuden lauseen tilanteeseen. Kun tilanteessa on useita lauseita, peli arpoo yhden.
5. Palaa **Start**-sivulle ja valitse **UPDATE GAME**: muutokset kirjoitetaan suoraan pelikansion `vintage.vbf`-tiedostoon.
   Päivitä peli selaimessa (F5), niin muutokset näkyvät. Ensimmäisellä kerralla selain kysyy luvan kirjoittaa kansioon.
   Firefoxissa valitse **SAVE SETUP (.VBF)** ja siirrä `vintage.vbf` pelin kansioon (korjaa nimi, jos selain lisäsi `(1)`).

## Ulkoasu (Look & layout)

- **Theme**: 20 teemaa eri aikojen peleistä ja tv-lähetyksistä, esim. Jam Session, Network '80s, Cable Sports '90s,
  Hardwood Classics, Handheld, Amber Scoreboard ja Box Score Print. Valinta muuttaa valikoiden, tulostaulun ja paneelien
  värit ja fontit.
- **Text size**: jokaisen paneelin tekstikoko erikseen (tulostaulu, sivupaneeli, pelaajatiedot, erätauon ja lopun
  pöytäkirjat, bannerit, tip off -kortti).
- **Tip-off card logos**: logojen koko ja paikka (nimen perässä, ennen nimeä, isot logot nimien yläpuolella tai ei logoja).
  Esikatselu näyttää kortin heti.

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
