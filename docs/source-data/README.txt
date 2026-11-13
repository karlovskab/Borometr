Srovnání 57 SŠ Plzeňského kraje, 2016–2025.
MŠMT: snapshot 2026-11-02, druh C00, jedna škola IZO, adresa sídla.
RÚIAN: současné adresní body. U Borské 2718/55 nahrazen neaktuální registry kód 24557064 aktuálním bodem 82984646 stejné adresy.
Počasí: soubor school-weather-2016-2025.json.gz obsahuje původní požadavky Open-Meteo a odpovědi ERA5-Land.
Roční průměr = součet denních teplot / počet dnů. Trend = OLS ročních průměrů vůči roku, násobený 10.
Rozdíl = 2025 minus 2016; deset kalendářních let, devítiletý rozestup krajních roků.
Rozdíl pětiletí = průměr 2021–2025 minus 2016–2020.
Prostorové rozlišení cca 9–11 km; nejde o povrchovou teplotu, mikroklima jednotlivých škol ani plošný průměr okruhů 1000 m.


Rozšíření 2. 11. 2026: bor-daily-era5land.json je původní odpověď Open-Meteo pro oblast Boru (denní průměry a maxima, 2011–2025); ukazatele stránky používají 2016–2025. Skript scripts/generate-climate-indices.py počítá měsíce, odchylky, počty dnů a CDD18.
NDVI: landsat-red.tif, landsat-nir08.tif, landsat-qa_radsat.tif ze stejné scény LC09_L2SP_192026_20250812_02_T1 jako teplota a QA. Odběr přes Microsoft Planetary Computer /api/data/v1/item/bbox/12.758,49.697,12.797,49.722.tif, collection=landsat-c2-l2, item=<scéna>, assets=<red|nir08|qa_radsat>, width=100, height=100, resampling=nearest. Vstupy obsahují datové pásmo a masku. Skript scripts/generate-landscape-indices.py vyžaduje numpy, tifffile a Pillow. Metoda a omezení jsou v landscape-indices.json.
Žádný uvedený návrh akce nezakládá partnerství ani objednávku. Odkazy organizátorů ověřeny 2. 11. 2026.
