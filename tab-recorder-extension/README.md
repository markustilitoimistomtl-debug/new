# Välilehtitallennin

Chrome/Edge-laajennus, joka tallentaa aktiivisen välilehden kuvan ja äänen videotiedostoksi.
Resoluutio on valittavissa, oletuksena **1440p (2560×1440)**.

## Asennus

1. Lataa tämä kansio (`tab-recorder-extension`) koneellesi.
2. Avaa Chromessa `chrome://extensions` (Edgessä `edge://extensions`).
3. Kytke päälle **Kehittäjätila** (Developer mode).
4. Valitse **Lataa pakkaamaton** (Load unpacked) ja osoita tämä kansio.
5. Kiinnitä punainen pallo -kuvake työkalupalkkiin.

Vaatii Chrome 116:n tai uudemman.

## Käyttö

1. Avaa tallennettava sivu ja klikkaa laajennuksen kuvaketta.
2. Valitse asetukset:
   - **Resoluutio**: 720p, 1080p, **1440p (oletus)** tai 4K
   - **Kuvataajuus**: 60 tai 30 fps
   - **Tiedostomuoto**: automaattinen (MP4 jos selain tukee, muuten WebM), MP4 tai WebM
   - **Ääni** päälle/pois
   - **Tarkka 16:9-koko**: video on täsmälleen valitun kokoinen; jos sivun muoto poikkeaa 16:9:stä, reunoille tulee mustat palkit. Pois päältä kuvasuhde säilyy ja valittu resoluutio on yläraja.
3. Paina **Aloita tallennus**. Kuvakkeessa näkyy `REC` tallennuksen ajan.
4. Lopeta kuvakkeen kautta tai pikanäppäimellä **Alt+Shift+R** (myös aloitus).

Tiedosto tallentuu Lataukset-kansion alikansioon `Välilehtitallennin`.

## Miksi tulos on nyt terävämpi kuin 720p

Chromen välilehtikaappaus käyttää oletuksena pientä kokoa. Tämä laajennus pyytää kaappaukselta
valitun koon minimi- ja maksimiarvoksi, jolloin Chrome piirtää välilehden suoraan tallennuskokoon
(ei skaalaa pientä kuvaa suuremmaksi). Bittinopeus säädetään resoluution mukaan
(1440p60 ≈ 24 Mbit/s).

Tallennuksen aikana välilehden ääni ohjataan edelleen kaiuttimiin, joten kuulet sen normaalisti.
