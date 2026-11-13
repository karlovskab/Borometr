/* Extra indices derived from the same daily observations and Landsat scene. */
(()=>{
 const q=s=>document.querySelector(s),f=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('cs-CZ',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 let climate,landscape,chosen=2025,chosenMonth=null,ndviOverlay;
 const specs={anomaly_C:{unit:'°C',digits:2,text:'Odchylka od průměru 2016–2020 (9,34 °C). Červené sloupce jsou nad touto referencí, modré pod ní. Každý sloupec je jeden celý rok.'},summer_days:{unit:'dnů',digits:0,text:'Počet dnů s denním maximem teploty vzduchu alespoň 25 °C. Zahrnuje také tropické dny.'},tropical_days:{unit:'dnů',digits:0,text:'Počet dnů s denním maximem teploty vzduchu alespoň 30 °C. Modelová maxima mohou lokální horko podhodnotit.'},longest_hot_run_days:{unit:'dnů v řadě',digits:0,text:'Nejdelší nepřerušená řada dnů s modelovým maximem ≥ 30 °C za rok. Vlastní ukazatel projektu, nikoli oficiální definice vlny veder.'},CDD18_C_days:{unit:'°C·den',digits:1,text:'Roční součet kladných rozdílů denní průměrné teploty nad 18 °C. Vyšší číslo znamená více tepla nad zvolenou hranicí; neudává energii spotřebovanou školou.'}};
 const months=['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];
 function choose(y,m=null){chosen=y;chosenMonth=m;renderChart();renderYear();renderMonths();year=y;q('#yearSlider').value=y;updateYear()}
 function renderYear(){const r=climate.annual.find(x=>x.year===chosen);const a=(r.anomaly_C>0?'+':'')+f(r.anomaly_C,2);q('#indexYear').innerHTML=`<div class="selectedYear">Vybraný rok ${r.year}${chosenMonth===null?'':` · ${months[chosenMonth]}: ${f(r.monthly_C[chosenMonth])} °C`}</div>`+[[f(r.mean_C,2)+' °C','Roční průměr'],[a+' °C','Odchylka od 2016–2020'],[f(r.summer_C,2)+' °C','Léto · červen–srpen'],[r.summer_days+' / '+r.tropical_days,'Letní / tropické dny'],[r.longest_hot_run_days+' dnů','Nejdelší tropická řada'],[f(r.CDD18_C_days)+' °C·den','CDD18 · součet za rok']].map(([v,label])=>`<div><b>${v}</b><span>${label}</span></div>`).join('')}
 function renderChart(){const key=q('#indexMetric').value,sp=specs[key],rs=climate.annual,vs=rs.map(r=>r[key]);let lo=Math.min(0,...vs),hi=Math.max(...vs);if(hi===lo)hi=lo+1;const pad=(hi-lo)*.15;hi+=pad;if(lo<0)lo-=pad;const Y=v=>248-(v-lo)/(hi-lo)*210,X=i=>80+i*86;let s='';
 for(let i=0;i<5;i++){const v=lo+(hi-lo)*i/4;s+=`<line x1="55" x2="940" y1="${Y(v)}" y2="${Y(v)}" stroke="#e4eaf3"/><text x="48" y="${Y(v)+4}" text-anchor="end">${f(v,hi>10?0:1)}</text>`}
 s+=`<text x="55" y="16">${sp.unit}</text><line x1="55" x2="940" y1="${Y(0)}" y2="${Y(0)}" stroke="#92a1b8"/>`;
 rs.forEach((r,i)=>{const v=r[key],yy=v>=0?Y(v):Y(0),height=Math.max(2,Math.abs(Y(v)-Y(0)));s+=`<g class="indexBar" tabindex="0" role="button" data-year="${r.year}" aria-label="${r.year}: ${f(v,sp.digits)} ${sp.unit}. Zobrazit rok"><title>${r.year}: ${f(v,sp.digits)} ${sp.unit}</title><rect x="${X(i)}" y="${yy}" width="44" height="${height}" rx="4" fill="${v<0?'#5c9bca':'#c75067'}" stroke="${chosen===r.year?'#122d66':'transparent'}" stroke-width="3"/><text x="${X(i)+22}" y="${v>=0?yy-9:yy+height+17}" text-anchor="middle">${v>0&&key==='anomaly_C'?'+':''}${f(v,sp.digits)}</text><text x="${X(i)+22}" y="285" text-anchor="middle">${r.year}</text></g>`});q('#indexChart').innerHTML=s;q('#indexChart').setAttribute('aria-label',q('#indexMetric').selectedOptions[0].textContent+' za roky 2016 až 2025');q('#indexExplanation').textContent=sp.text+' Klikněte na sloupec pro všechny údaje roku.';q('#indexChart').querySelectorAll('[data-year]').forEach(el=>{el.onclick=()=>choose(+el.dataset.year);el.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();choose(+el.dataset.year)}}})}
 function heatColor(t){const k=Math.max(0,Math.min(1,(t+7)/29)),stops=[[200,222,244],[239,241,239],[248,212,171],[232,168,162]],i=Math.min(2,Math.floor(k*3)),a=k*3-i;return `rgb(${stops[i].map((v,j)=>Math.round(v+(stops[i+1][j]-v)*a)).join(',')})`}
 function renderMonths(){q('#monthlyTable').innerHTML='<caption>Teplota vzduchu ve 2 m · ERA5-Land · °C</caption><thead><tr><th scope="col">Rok</th>'+months.map(m=>`<th scope="col">${m}</th>`).join('')+'</tr></thead><tbody>'+climate.annual.map(r=>`<tr class="${r.year===chosen?'chosen':''}"><th scope="row">${r.year}</th>`+r.monthly_C.map((v,m)=>`<td><button data-year="${r.year}" data-month="${m}" class="${r.year===chosen&&m===chosenMonth?'selected':''}" style="background:${heatColor(v)}" aria-label="${months[m]} ${r.year}: ${f(v)} °C" title="${months[m]} ${r.year}: ${f(v,2)} °C">${f(v)}</button></td>`).join('')+'</tr>').join('')+'</tbody>';q('#monthlyTable').querySelectorAll('button').forEach(el=>el.onclick=()=>choose(+el.dataset.year,+el.dataset.month))}
 q('#indexMetric').onchange=renderChart;
 fetch('climate-indices.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{climate=j;renderChart();renderYear();renderMonths();q('#indicesTable').innerHTML='<thead><tr>'+['Rok','Roční °C','Odchylka °C','Léto °C','Letní dny','Tropické dny','Nejdelší řada dnů','CDD18 °C·den'].map(x=>`<th>${x}</th>`).join('')+'</tr></thead><tbody>'+j.annual.map(r=>'<tr>'+[r.year,f(r.mean_C,2),f(r.anomaly_C,2),f(r.summer_C,2),r.summer_days,r.tropical_days,r.longest_hot_run_days,f(r.CDD18_C_days)].map(x=>`<td>${x}</td>`).join('')+'</tr>').join('')+'</tbody>'}).catch(()=>{q('#indexYear').textContent='Podrobné klimatické údaje se nepodařilo načíst. Zkuste stránku obnovit.'});
 function selectedLandscapeZone() {
   if (!landscape) return null;
   const selected = q('#zoneSelect').value;
   const original = landscape.zones.find(zone => zone.id === selected);
   if (radiusMeters === 1000 || selected === 'all') return original;
   if (!detailData) return null;
   const point = places.find(placeInfo => placeInfo.id === selected);
   const temperatures = [];
   const vegetation = [];
   let cells = 0;
   const [west, south, east, north] = landscape.bounds;
   const radians = degrees => degrees * Math.PI / 180;
   for (let row = 0; row < landscape.height; row++) {
     const latitude = north - (row + 0.5) * (north - south) / landscape.height;
     for (let column = 0; column < landscape.width; column++) {
       const longitude = west + (column + 0.5) * (east - west) / landscape.width;
       const arc = Math.sin(radians(latitude - point.lat) / 2) ** 2 +
         Math.cos(radians(point.lat)) * Math.cos(radians(latitude)) *
         Math.sin(radians(longitude - point.lon) / 2) ** 2;
       const distance = 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(arc)));
       if (distance > radiusMeters) continue;
       cells++;
       const temperature = detailData.temperature_C[row][column];
       const ndvi = landscape.ndvi[row][column];
       if (Number.isFinite(temperature)) temperatures.push(temperature);
       if (Number.isFinite(ndvi)) vegetation.push(ndvi);
     }
   }
   temperatures.sort((a, b) => a - b);
   vegetation.sort((a, b) => a - b);
   const percentile = (values, fraction) => {
     if (!values.length) return null;
     const position = (values.length - 1) * fraction;
     const lower = Math.floor(position);
     const upper = Math.ceil(position);
     return values[lower] + (values[upper] - values[lower]) * (position - lower);
   };
   return {
     id: selected, name: `${point.name} · okruh ${radiusMeters} m`, cells,
     temperature_valid: temperatures.length,
     temperature_coverage_pct: cells ? temperatures.length / cells * 100 : 0,
     min_C: temperatures[0] ?? null, max_C: temperatures.at(-1) ?? null,
     median_C: percentile(temperatures, 0.5),
     p10_C: percentile(temperatures, 0.1), p90_C: percentile(temperatures, 0.9),
     hot35_pct: temperatures.length ? temperatures.filter(value => value >= 35).length / temperatures.length * 100 : null,
     ndvi_valid: vegetation.length,
     ndvi_coverage_pct: cells ? vegetation.length / cells * 100 : 0,
     ndvi_median: percentile(vegetation, 0.5),
     ndvi_high_pct: vegetation.length ? vegetation.filter(value => value >= 0.5).length / vegetation.length * 100 : null
   };
 }

 function zoneStats() {
   q('#zoneSelect').options[0].textContent = `Okruh školy · ${f(radiusMeters,0)} m`;
   q('#zoneSelect').options[1].textContent = `Okruh OV · ${f(radiusMeters,0)} m`;
   q('#zoneTitle').textContent = `Jak vypadá okolí do ${f(radiusMeters,0)} metrů?`;
   q('#radiusStatsNote').textContent = radiusMeters === 100 ?
     'U okruhu 100 m vyhodnocujeme malou oblast s několika tepelnými rozlišovacími prvky senzoru. Buňky výstupní mřížky jsou jemnější a sousední hodnoty spolu souvisejí. Pro rozdíly mezi stínem a asfaltem potřebujeme terénní měření.' :
     'Okruhy 1 000 m poskytují širší kontext a navzájem se překrývají. Teplota povrchu má rozlišení senzoru přibližně 100 m.';
   const zone = selectedLandscapeZone();
   q('#downloadZoneStats').disabled = !zone;
   if (!zone) {
     q('#zoneStats').textContent = 'Načítám rastry pro výpočet zvoleného okruhu…';
     return;
   }
   q('#zoneStats').innerHTML = [
     [f(zone.median_C)+' °C', 'Medián povrchu', 'Prostřední hodnota'],
     [f(zone.p10_C)+'–'+f(zone.p90_C)+' °C', 'P10–P90', 'Prostředních přibližně 80 % hodnot'],
     [f(zone.hot35_pct)+' %', 'Povrch ≥ 35 °C', 'Z platných teplotních buněk'],
     [f(zone.ndvi_median,2), 'Medián NDVI', 'Vegetační index · bez jednotky'],
     [f(zone.min_C)+' °C', 'Minimum povrchu', 'Nejchladnější platná buňka'],
     [f(zone.max_C)+' °C', 'Maximum povrchu', 'Nejteplejší platná buňka'],
     [f(zone.ndvi_high_pct)+' %', 'NDVI ≥ 0,50', 'Podíl zelenějších buněk, ne korun'],
     [zone.temperature_valid.toLocaleString('cs-CZ'), 'Platné teplotní buňky', 'Počet buněk výstupní mřížky']
   ].map(([value,label,explanation]) => `<div class="zoneStat"><div class="statLabel">${label}</div><strong>${value}</strong><span>${explanation}</span></div>`).join('');
   q('#zoneCoverage').textContent = `${zone.name} · celkem ${zone.cells.toLocaleString('cs-CZ')} buněk. ` +
     `Teplota dostupná pro ${f(zone.temperature_coverage_pct,2)} %, NDVI pro ${f(zone.ndvi_coverage_pct,2)} % (${zone.ndvi_valid.toLocaleString('cs-CZ')} buněk). ` +
     'Počítáme buňky se středem uvnitř výběru. Teploty jsou odvozeny z rastru zaokrouhleného na 0,01 °C. Celý výřez má vlastní pevné hranice.';
 }
 q('#zoneSelect').onchange = zoneStats;
 document.addEventListener('mapradiuschange', zoneStats);
 document.addEventListener('thermaldataready', zoneStats);
 q('#downloadZoneStats').onclick = () => {
   const zone = selectedLandscapeZone();
   if (!zone) return;
   const blob = new Blob([JSON.stringify({
     scene: landscape.scene, acquired: landscape.acquired,
     radius_m: zone.id === 'all' ? null : radiusMeters,
     thermal_sensor_resolution_m: 100, optical_band_resolution_m: 30,
     method: zone.id === 'all' ? 'All valid cell centres in the full available cutout; equal cell weights.' : `Cell centres within a haversine ${radiusMeters} m circle; equal cell weights. Thermal source resolution is approximately 100 m.`, thresholds: landscape.thresholds, statistics: zone
   }, null, 2)], {type: 'application/json'});
   const link = document.createElement('a');
   link.href = URL.createObjectURL(blob);
   link.download = `Borometr_${zone.id}_${zone.id === 'all' ? 'vyrez' : radiusMeters+'m'}_2025-08-12.json`;
   link.click();
   setTimeout(() => URL.revokeObjectURL(link.href), 1000);
 };

 function pixel(p){if(!landscape)return null;const b=landscape.bounds,x=Math.floor((p.lng-b[0])/(b[2]-b[0])*100),y=Math.floor((b[3]-p.lat)/(b[3]-b[1])*100);return x<0||y<0||x>=100||y>=100?null:{x,y,ndvi:landscape.ndvi[y][x]}}
 const baseDetailHtml=detailHtml;detailHtml=function(p){const cell=pixel(p);let html=baseDetailHtml(p);if(cell){const z=selectedLandscapeZone(),t=sampleDetail(p);html+=`<div class="pixelExtra"><b>NDVI: ${f(cell.ndvi,2)}</b> · stejný přelet<br>Buňka výřezu: řádek ${cell.y+1}, sloupec ${cell.x+1}<br>${t===null||!Number.isFinite(z?.median_C)?'':`Povrch vůči mediánu zóny „${z.name}“: ${t-z.median_C>=0?'+':''}${f(t-z.median_C)} °C.<br>`}<small>Porovnání s referenční zónou, i pokud bod leží mimo ni. NDVI neudává počet stromů.</small></div>`}return html};
 function ndviHtml(p){const cell=pixel(p);return `<b>NDVI · ${cell?f(cell.ndvi,2):'mimo výřez'}</b><br>Landsat 9 · 12. 8. 2025, 11:57 SELČ<br>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}<br><small>Optické pásmo cca 30 m. Index zelenosti, nikoli dnešní teplota nebo procento stromů.</small>${cell?`<br>Buňka ${cell.y+1} / ${cell.x+1}`:''}`}
 function ndviMarkers(){labels.forEach((l,i)=>{const p=places.filter(p=>place==='both'||p.id===place)[i],v=pixel({lat:p.lat,lng:p.lon});l.setIcon(L.divIcon({className:'livepoint tempLabel',html:`${p.id==='school'?'Škola':'OV'} · NDVI ${v?f(v.ndvi,2):'—'}<div style="font-size:9px;font-weight:400;color:#66776d">Okolní pixel · 12. 8. 2025</div>`}));l.bindPopup(ndviHtml({lat:p.lat,lng:p.lon}))})}
 const baseDraw=drawMap;drawMap=function(fit){baseDraw(fit);renderLiveMapReadings();if(detailOn)q('#mapTitle').textContent='Bor · teplota povrchu · 12. 8. 2025';if(q('#cityLayer').value==='ndvi'&&landscape&&map){ndviMarkers();q('#mapTitle').textContent='Bor · vegetační index NDVI · 12. 8. 2025';q('#mapNote').textContent='Barvy a štítky nyní ukazují vegetační index NDVI. Zelenější pixel může zahrnovat stromy, trávu i zemědělské porosty. Teplota a NDVI jsou různé veličiny.'}};
 const baseShow=showThermal;showThermal=function(){syncMapPresentation();if(ndviOverlay&&map)map.removeLayer(ndviOverlay);if(q('#cityLayer').value!=='ndvi'){baseShow();syncMapPresentation();if(q('#cityLayer').value==='off')drawMap();return}if(!map)return;q('#cityLayer').value='off';baseShow();q('#cityLayer').value='ndvi';detailOn=false;cityMode=true;q('#thermalDate').disabled=true;q('#thermalDate').value='2025-08-12';q('#detailReadout').hidden=false;q('#detailReadout').textContent='Klikněte do vegetační mapy pro hodnotu NDVI.';q('#thermalInfo').hidden=false;q('#air').classList.remove('active');q('#surface').classList.remove('active');if(!landscape){q('#thermalInfo').textContent='Načítám vegetační index…';return}if(!map.getPane('detailPane')){map.createPane('detailPane');map.getPane('detailPane').style.zIndex=350;map.getPane('detailPane').style.pointerEvents='none'}const b=landscape.bounds;ndviOverlay=L.imageOverlay('landsat-ndvi.png',[[b[1],b[0]],[b[3],b[2]]],{opacity:+q('#thermalOpacity').value/100,pane:'detailPane',interactive:false,attribution:'NDVI: USGS Landsat 9 / Microsoft Planetary Computer'}).addTo(map);q('#thermalInfo').innerHTML='<b>Vegetační index NDVI · 12. 8. 2025</b><div style="display:flex;align-items:center;gap:10px;margin:12px 0"><span>−1</span><span style="height:14px;flex:1;border-radius:5px;background:linear-gradient(90deg,#274672 0%,#b7a27d 50%,#e6d59e 60%,#7eb85a 75%,#1b7341 90%,#004127 100%)"></span><span>+1</span></div>NDVI vypočten z povrchové odrazivosti červeného a blízkého infračerveného pásma stejné scény jako teplotní mapa. Vyšší hodnoty zpravidla značí zelenější vegetaci. Nízké a záporné hodnoty mohou zahrnovat vodu či zástavbu; samy neurčují druh povrchu. Neplatná data jsou průhledná.<br><b>Rozlišení optických pásem 30 m.</b> Zobrazená mřížka cca 28 m nepřidává další měření. Pro čtení barev lze vypnout překryvnou vrstvu Zeleň OSM.';const ramp=q('.mapkey > span');if(ramp)ramp.hidden=true;drawMap()};
 q('#cityLayer').onchange=()=>showThermal();const baseOpacity=q('#thermalOpacity').oninput;q('#thermalOpacity').oninput=e=>{baseOpacity?.(e);ndviOverlay?.setOpacity(+e.target.value/100)};
 if(map)map.on('click',e=>{if(q('#cityLayer').value==='ndvi'){const html=ndviHtml(e.latlng);q('#detailReadout').innerHTML=html;L.popup({maxWidth:340}).setLatLng(e.latlng).setContent(html).openOn(map)}});
 fetch('landscape-indices.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{landscape=j;zoneStats();if(q('#cityLayer').value==='ndvi')showThermal()}).catch(()=>{q('#zoneStats').textContent='Statistiky krajiny se nepodařilo načíst. Zkuste stránku obnovit.';if(q('#cityLayer').value==='ndvi')q('#thermalInfo').textContent='Vegetace se nepodařila načíst. Zkuste obnovit stránku.'});
})();


