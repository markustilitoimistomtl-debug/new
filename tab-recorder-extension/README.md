# Välilehtitallennin

Chrome/Edge-laajennus, joka tallentaa aktiivisen välilehden kuvan ja äänen videotiedostoksi
ja ottaa kuvakaappauksia JPG-muodossa. Resoluutio on valittavissa, oletuksena **1440p (2560×1440)**.

## Asennus

1. Lataa tämä kansio (`tab-recorder-extension`) koneellesi.
2. Avaa Chromessa `chrome://extensions` (Edgessä `edge://extensions`).
3. Kytke päälle **Kehittäjätila** (Developer mode).
4. Valitse **Lataa pakkaamaton** (Load unpacked) ja osoita tämä kansio.
5. Kiinnitä punainen pallo -kuvake työkalupalkkiin.

Vaatii Chrome 116:n tai uudemman.

## Käyttö

1. Avaa tallennettava sivu ja klikkaa laajennuksen kuvaketta.
2. Anna halutessasi **Työn nimi** (esim. `Esittely osa 1`). Tiedoston nimeksi tulee tällöin pelkkä
   nimi + pääte, esim. `Esittely osa 1.mp4` tai `Esittely osa 1.jpg`. Jos samanniminen tiedosto on jo olemassa,
   Chrome lisää perään numeron (`Esittely osa 1 (1).mp4`). Tyhjänä nimi muodostetaan välilehden otsikosta,
   päivästä, kellonajasta ja resoluutiosta. Nimi säilyy seuraavaan kertaan, ja se näkyy
   tallennuksen aikana ajastimen yläpuolella. Enter aloittaa tallennuksen.
3. Valitse asetukset:
   - **Resoluutio**: 720p, 1080p, **1440p (oletus)** tai 4K
   - **Kuvataajuus**: 60 tai 30 fps
   - **Tiedostomuoto**: automaattinen (MP4 jos selain tukee, muuten WebM), MP4 tai WebM
   - **Ääni** päälle/pois
   - **Tarkka 16:9-koko**: video on täsmälleen valitun kokoinen; jos sivun muoto poikkeaa 16:9:stä, reunoille tulee mustat palkit. Pois päältä kuvasuhde säilyy ja valittu resoluutio on yläraja.
4. Paina **Aloita tallennus**. Kuvakkeessa näkyy `REC` tallennuksen ajan.
5. Lopeta kuvakkeen kautta tai pikanäppäimellä **Alt+Shift+R** (myös aloitus).
6. **Peruuta**: tallennuksen aikana näkyy painike **Peruuta (ei tallenneta)** (myös **Alt+Shift+X**).
   Tallennus loppuu heti eikä mitään tiedostoa synny.

Tiedosto tallentuu Lataukset-kansion alikansioon `Välilehtitallennin`.

## Kuvakaappaus (JPG)

- Paina **📷 Ota kuvakaappaus (JPG)** tai **Alt+Shift+S**.
- Asetukset kohdassa *Kuvakaappaus (JPG)*: resoluutio (**oletus 1440p**, 2560×1440) ja JPG-laatu (oletus 92 %).
- Kuva otetaan samalla terävällä tavalla kuin video: Chrome piirtää välilehden suoraan valittuun kokoon.
  Asetus *Tarkka 16:9-koko* koskee myös kuvia.
- Kuvan voi ottaa myös kesken tallennuksen. Silloin kuva otetaan tallennettavasta kuvasta,
  joten sen koko on tallennuksen resoluutio (välilehteä ei voi kaapata kahdesti yhtä aikaa).
- Kuvat tallentuvat samaan `Välilehtitallennin`-kansioon nimellä `sivun-nimi_päivä_aika_1440p.jpg`.

## Miksi tulos on nyt terävämpi kuin 720p

Chromen välilehtikaappaus käyttää oletuksena pientä kokoa. Tämä laajennus pyytää kaappaukselta
valitun koon minimi- ja maksimiarvoksi, jolloin Chrome piirtää välilehden suoraan tallennuskokoon
(ei skaalaa pientä kuvaa suuremmaksi). Bittinopeus säädetään resoluution mukaan
(1440p60 ≈ 24 Mbit/s).

Tallennuksen aikana välilehden ääni ohjataan edelleen kaiuttimiin, joten kuulet sen normaalisti.
