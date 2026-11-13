# BORometr – klima pod lupou

Studentský projekt Střední školy Bor. Web obsahuje vývoj modelové teploty vzduchu v letech 2016–2025, družicovou teplotu povrchu, vegetační index NDVI a srovnání středních škol Plzeňského kraje.

## Zveřejnění přes GitHub Pages

1. Nahrajte obsah tohoto balíčku do hlavní větve repozitáře.
2. V repozitáři otevřete Settings → Pages.
3. V Build and deployment zvolte Deploy from a branch.
4. Vyberte větev main, složku /docs a Save.
5. GitHub v této sekci zobrazí adresu webu po dokončení publikace.

## Místní spuštění

Spusťte z kořene repozitáře `python3 -m http.server 8000 --directory docs` a otevřete http://localhost:8000.

## Data a aktualizace

Historie ERA5-Land popisuje širší oblast v mřížce přibližně 9–11 km. Detailní tepelná mapa zachycuje přelet Landsat 9 dne 12. 8. 2025. Tepelné rozlišení senzoru je přibližně 100 m. NDVI má optické rozlišení 30 m. Aktuální modelové počasí se stahuje z Open-Meteo při otevření stránky a každých 15 minut.

Vstupy a metodika jsou v docs/source-data a v příslušných JSON souborech. Skripty pro opětovné zpracování jsou ve scripts. Generování vegetačního indexu vyžaduje numpy, tifffile a Pillow.

## Zdroje

Open-Meteo / Copernicus ECMWF ERA5-Land, USGS Landsat / Microsoft Planetary Computer, OpenStreetMap, MŠMT a ČÚZK. Logo školy pochází z oficiálního webu SŠ Bor. Uvedení zdrojů a jejich podmínky je nutné zachovat.
