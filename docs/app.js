const $=s=>document.querySelector(s),fmt=(n,d=2)=>n.toLocaleString('cs-CZ',{minimumFractionDigits:d,maximumFractionDigits:d});
let rows=[],metric='prumer_C',year=2025,place='both',mode='air',map,circles=[],labels=[],weather=[],busy=false;
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
let weatherFetchedAt = null;
let weatherFetchFailed = false;
const places=[{id:'school',name:'Hlavní škola',address:'Plzeňská 231',lat:49.7108382,lon:12.7771834,color:'#176c50'},{id:'ov',name:'Pracoviště OV',address:'Strážská 483',lat:49.7080373,lon:12.7789787,color:'#98622c'}];
function chart(){if(!rows.length)return;let vals=rows.map(r=>r[metric]),base=vals.slice(0,5).reduce((a,b)=>a+b)/5,min=metric==='tropicke_dny'?0:Math.floor(Math.min(...vals)-.5),max=Math.ceil(Math.max(...vals)+.5),Y=v=>215-(v-min)/(max-min)*180;
let s='';for(let i=0;i<5;i++){let v=min+(max-min)*i/4;s+=`<line x1="40" y1="${Y(v)}" x2="605" y2="${Y(v)}" stroke="#edf0e8"/><text x="32" y="${Y(v)+4}" text-anchor="end">${fmt(v,metric==='tropicke_dny'?0:1)}</text>`}
rows.forEach((r,i)=>{let x=50+i*55,h=215-Y(r[metric]);s+=`<rect class="bar" data-year="${r.rok}" tabindex="0" role="button" aria-label="Rok ${r.rok}: ${fmt(r[metric])}" x="${x}" y="${Y(r[metric])}" width="35" height="${Math.max(h,2)}" rx="3" fill="${r[metric]>=base?'#c48a5d':'#8aac9b'}" stroke="${year===r.rok?'#173e36':'none'}" stroke-width="2"><title>${r.rok}: ${fmt(r[metric])} ${metric==='tropicke_dny'?'dní':'°C'}</title></rect>`;if(true)s+=`<text x="${x+17.5}" y="239" text-anchor="middle">${r.rok}</text>`});s+=`<line x1="40" x2="605" y1="${Y(base)}" y2="${Y(base)}" stroke="#87937d" stroke-dasharray="4 4"/>`;
$('#chart').innerHTML=s;$('#chart').setAttribute('aria-label',`Vývoj ${metric==='tropicke_dny'?'počtu tropických dnů':'průměrné teploty v °C'} 2016–2025`);document.querySelectorAll('.bar').forEach(b=>{const choose=()=>{year=+b.dataset.year;$('#yearSlider').value=year;updateYear()};b.onclick=choose;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}}});}
function updateYear(){const r=rows.find(r=>r.rok===year);if(!r)return;$('#annualLabel').textContent=`Průměrná teplota v roce ${year}`;$('#annualValue').innerHTML=`${fmt(r.prumer_C)} <span style="font-size:20px">°C</span>`;$('#annualSub').textContent=`Letní průměr ${fmt(r.leto_C)} °C`;$('#yearText').textContent=year;let previous=rows.find(r=>r.rok===year-1);$('#yearNote').textContent=`${year}: ${r.tropicke_dny} tropických a ${r.letni_dny} letních dnů.`+(previous?` Roční průměr byl o ${fmt(Math.abs(r.prumer_C-previous.prumer_C))} °C ${r.prumer_C>=previous.prumer_C?'vyšší':'nižší'} než v předchozím roce.`:' První rok sledovaného období.');chart()}
function color(t){return t<0?'#7cadd1':t<10?'#75bc9b':t<20?'#d4c780':t<30?'#d49a63':'#ce7150'}
function drawMap(fit=false){if(!map)return;circles.forEach(x=>map.removeLayer(x));labels.forEach(x=>map.removeLayer(x));circles=[];labels=[];const shown=places.filter(p=>place==='both'||p.id===place);shown.forEach(p=>{const w=weather.find(w=>w.id===p.id);circles.push(L.circle([p.lat,p.lon],{radius:1000,color:p.color,weight:2,dashArray:p.id==='ov'?'6 5':null,fillColor:w&&mode==='air'?color(w.temp):p.color,fillOpacity:mode==='air'&&w?.temp!=null?.18:.035}).addTo(map));const marker=L.marker([p.lat,p.lon],{icon:L.divIcon({className:'livepoint',html:`${p.id==='school'?'Š':'OV'}${w&&mode==='air'?` · ${fmt(w.temp,1)} °C`:''}`})}).addTo(map);marker.bindPopup(`<b>${p.name}</b><br>${p.address}<br>Poloměr: 1 000 m${w?`<br>Vzduch: ${fmt(w.temp,1)} °C<br>Modelový čas: ${w.time.replace('T',' ')}`:''}`);labels.push(marker)});if(fit)map.fitBounds(L.featureGroup(circles).getBounds(),{padding:[20,20]});$('#mapTitle').textContent=place==='both'?'Škola a OV · dva okruhy do 1 000 m':`${shown[0].name} · okolí do 1 000 m`}
function initMap(){if(!window.L){$('#map').innerHTML='<p style="padding:25px">Mapový podklad se nepodařilo načíst. Zkontrolujte připojení a obnovte stránku.</p>';return}map=L.map('map',{scrollWheelZoom:false}).setView([49.7095,12.778],14);const tile=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © Esri and contributors'}).addTo(map);let errors=0;tile.on('tileerror',()=>{if(++errors===3)$('#mapStatus').textContent='Mapové dlaždice nedostupné; okruhy zůstávají zobrazeny.'});L.control.scale({imperial:false}).addTo(map);drawMap(true)}
function formatWeatherTime(timestamp) {
  return new Intl.DateTimeFormat('cs-CZ', {
    timeZone: 'Europe/Prague', day: 'numeric', month: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(timestamp));
}

function weatherIsStale(reading) {
  if (!reading) return false;
  return weatherFetchFailed || Date.now() - reading.validAt > 45 * 60 * 1000 ||
    (weatherFetchedAt !== null && Date.now() - weatherFetchedAt > 30 * 60 * 1000);
}

function syncMapPresentation() {
  const live = $('#cityLayer').value === 'off';
  $('#liveMapReadings').hidden = !live;
  document.querySelector('.landscapeDashboard').hidden = !['detail', 'ndvi'].includes($('#cityLayer').value);
  $('#thermalDate').closest('label').hidden = live;
  $('#thermalOpacity').closest('label').hidden = live;
  if (live) {
    $('#detailReadout').hidden = true;
    $('#thermalInfo').hidden = true;
    $('#mapTitle').textContent = 'Aktuální teplota vzduchu · škola a OV · Open-Meteo';
    $('#mapNote').textContent = 'Teplotní štítky a kruhy ukazují současný modelový odhad vzduchu u školy a OV. Obě blízká místa mohou mít shodnou hodnotu. Čas platnosti je uveden přímo u teplot. Pro měření místního mikroklimatu potřebujeme čidla.';
    $('#air').classList.add('active');
    $('#surface').classList.remove('active');
    const ramp = document.querySelector('.mapkey > span');
    if (ramp) ramp.hidden = true;
  }
}

function liveWeatherPopup(placeInfo, reading) {
  const title = `<b>${placeInfo.name}</b><br>${placeInfo.address}`;
  if (!reading) return title + '<br>Aktuální údaj se načítá nebo je nedostupný.';
  return title + `<br><b>${fmt(reading.temp, 1)} °C · vzduch</b>` +
    `<br>${weatherIsStale(reading) ? 'Starší údaj' : 'Platnost modelu'} ${reading.time} (Praha)` +
    `<br>Staženo ${formatWeatherTime(weatherFetchedAt)} (Praha)` +
    `<br>Zdroj Open-Meteo · modelový odhad ve 2 m` +
    `<br>Vrácený modelový bod ${fmt(reading.grid[0], 4)}, ${fmt(reading.grid[1], 4)}`;
}

function renderLiveMapReadings() {
  syncMapPresentation();
  if ($('#cityLayer').value !== 'off') return;
  const grid = $('#liveMapReadings');
  grid.innerHTML = places.map(placeInfo => {
    const reading = weather.find(item => item.id === placeInfo.id);
    const stale = weatherIsStale(reading);
    const status = !reading ? (busy ? 'Načítám aktuální údaje…' : 'Data nyní nejsou dostupná') :
      `${stale ? 'Starší údaj · platnost' : 'Platnost'} ${reading.time} (Praha)`;
    return `<article class="liveReading"><h3>${placeInfo.name}</h3>` +
      `<div class="small">${placeInfo.address}</div>` +
      `<strong>${reading ? fmt(reading.temp, 1) + ' °C' : '—'}</strong>` +
      `<div class="small ${stale ? 'warning' : ''}">${status}</div>` +
      `<div class="small">${reading ? 'Staženo ' + formatWeatherTime(weatherFetchedAt) + ' · ' : ''}` +
      `Vzduch ve 2 m · Open-Meteo</div></article>`;
  }).join('');
}

async function refresh() {
  if (busy) return;
  busy = true;
  $('#refresh').disabled = true;
  $('#liveTime').textContent = 'Aktualizuji modelová data…';
  try {
    const query = new URLSearchParams({
      latitude: places.map(point => point.lat).join(','),
      longitude: places.map(point => point.lon).join(','),
      current: 'temperature_2m', timezone: 'Europe/Prague',
      timeformat: 'unixtime', forecast_days: '1'
    });
    const response = await fetch('https://api.open-meteo.com/v1/forecast?' + query, {
      cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length !== places.length) throw new Error('Neplatná odpověď');
    const nextReadings = payload.map((item, index) => {
      if (!Number.isFinite(item.current?.temperature_2m) || !Number.isFinite(item.current?.time) ||
          !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) {
        throw new Error('Chybí teplota, čas nebo modelový bod');
      }
      const validAt = item.current.time * 1000;
      return {
        id: places[index].id, temp: item.current.temperature_2m,
        validAt, time: formatWeatherTime(validAt), grid: [item.latitude, item.longitude]
      };
    });
    weather = nextReadings;
    weatherFetchedAt = Date.now();
    weatherFetchFailed = false;
  } catch (error) {
    weatherFetchFailed = true;
  } finally {
    busy = false;
    $('#refresh').disabled = false;
    const schoolReading = weather.find(item => item.id === 'school');
    if (schoolReading) {
      $('#current').innerHTML = `${fmt(schoolReading.temp, 1)} <span style="font-size:20px">°C</span>`;
      $('#liveTime').textContent = `${weatherIsStale(schoolReading) ? 'Starší údaj · ' : ''}` +
        `Platnost ${schoolReading.time} (Praha). Obnova po 15 min.`;
    } else {
      $('#liveTime').textContent = 'Aktuální data nejsou dostupná. Zkuste Obnovit.';
    }
    $('#mapStatus').textContent = weatherFetchFailed ?
      (weather.length ? 'Obnova selhala · starší modelové údaje' : 'Počasí nedostupné') :
      (weather.some(weatherIsStale) ? 'Open-Meteo · starší modelové údaje' : 'Připojeno · Open-Meteo');
    drawMap();
  }
}
document.querySelectorAll('.place').forEach(b=>b.onclick=()=>{place=b.dataset.place;document.querySelectorAll('.place').forEach(x=>x.classList.toggle('active',x===b));drawMap(true)});document.querySelectorAll('.metric').forEach(b=>b.onclick=()=>{metric=b.dataset.metric;document.querySelectorAll('.metric').forEach(x=>x.classList.toggle('active',x===b));chart()});$('#yearSlider').oninput=e=>{year=+e.target.value;updateYear()};$('#refresh').onclick=refresh;
function setMode(m){mode=m;$('#air').classList.toggle('active',m==='air');$('#surface').classList.toggle('active',m==='surface');$('#mapNote').innerHTML=m==='air'?'Barevné štítky ukazují aktuální modelovou teplotu vzduchu u školy a OV. Oranžové půdorysy označují jejich budovy, zelené plochy mapovanou zeleň. Model nemusí prostorově rozlišit obě blízká pracoviště.':'<b>Družicová teplota povrchu zatím není napojena.</b> Mapa zobrazuje pouze sledované okruhy. Pro historické i aktuální povrchové mapy je potřeba zpracovat bezoblačné snímky Landsat. Datum snímku musí být vždy uvedeno; nejde o živý teploměr.';drawMap()};$('#air').onclick=()=>setMode('air');$('#surface').onclick=()=>setMode('surface');$('#download').onclick=()=>{const blob=new Blob([JSON.stringify({source:'Open-Meteo / Copernicus ECMWF ERA5-Land',scope:'Oblast Boru, nikoli průměr okruhů 1000 m',requested_point:[49.711,12.776],grid_point:[49.699997,12.800003],annual:rows},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Bor_teploty_2016_2025.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
fetch('annual.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{rows=j.filter(r=>r.rok>=2016);$('#dataTable').innerHTML=rows.map(r=>`<tr><td>${r.rok}</td><td>${fmt(r.prumer_C)}</td><td>${fmt(r.leto_C)}</td><td>${r.tropicke_dny}</td></tr>`).join('');updateYear()}).catch(()=>{$('#yearNote').textContent='Historická data se nepodařilo načíst.'});initMap();refresh();setInterval(refresh, WEATHER_REFRESH_MS);
// Update freshness labels between fetches, including after a suspended tab resumes.
setInterval(() => { if (map) drawMap(); }, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    drawMap();
    if (weatherFetchedAt === null || Date.now() - weatherFetchedAt >= WEATHER_REFRESH_MS) refresh();
  }
});

// Actual OSM geometries, downloaded 2026-11-02, not inferred temperature surfaces.
let geoData,greenLayer,buildingLayer,outlineLayer,satellite;
const siteWayIds={257010624:'school',257011423:'ov'};
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function isNear(e,centers){const pts=e.type==='node'?[e]:e.geometry||[];return pts.some(v=>centers.some(p=>map.distance([v.lat,v.lon],[p.lat,p.lon])<=1000))||Object.keys(siteWayIds).includes(String(e.id))}
function renderGeo(){if(!map||!geoData)return;[greenLayer,buildingLayer,outlineLayer].forEach(l=>{if(l)map.removeLayer(l)});greenLayer=L.layerGroup();buildingLayer=L.layerGroup();outlineLayer=L.layerGroup();let green=0,trees=0,buildings=0;const centers=places.filter(p=>place==='both'||p.id===place);
 geoData.elements.filter(e=>isNear(e,centers)).forEach(e=>{let t=e.tags||{};if(e.type==='node'){trees++;L.circleMarker([e.lat,e.lon],{radius:5,color:'#245c35',weight:1,fillColor:'#43874d',fillOpacity:.9}).bindPopup('Strom evidovaný v OpenStreetMap. Nejde o úplný inventář stromů.').addTo(greenLayer);return}let g=e.geometry;if(!g||g.length<4)return;const pts=g.map(v=>[v.lat,v.lon]);if(t.building){buildings++;const site=places.find(p=>p.id===siteWayIds[e.id]);const poly=L.polygon(pts,{color:site?'#9b561c':'#82968c',weight:site?3:1,fillColor:site?'#e4a35b':'#a1b9a8',fillOpacity:site?.6:.22});poly.bindPopup(`<b>${site?site.name:'Budova'}</b>${site?'<br>'+site.address:''}<br>Skutečný půdorys z OpenStreetMap.<br>${site?'Přiřazeno podle adresního bodu uvnitř budovy. Nevymezuje celý areál.<br>':''}<a href="https://www.openstreetmap.org/way/${e.id}" target="_blank" rel="noopener">Zdroj půdorysu ↗</a>`);poly.addTo(site?outlineLayer:buildingLayer);if(site)poly.bindTooltip(site.name,{permanent:false,direction:'bottom',className:'siteLabel'});}else{green++;let name=t.landuse==='forest'||t.natural==='wood'?'Les / porost dřevin':t.landuse==='meadow'?'Louka':t.leisure==='park'?'Park':t.leisure==='garden'?'Zahrada':t.landuse==='orchard'?'Sad':t.natural==='scrub'?'Křoviny':'Travnatá / zelená plocha';L.polygon(pts,{color:'#43864e',weight:1,fillColor:'#68a56b',fillOpacity:.45}).bindPopup(`<b>${name}</b>${t.name?'<br>'+escapeHtml(t.name):''}<br>Mapovaná plocha OSM, nikoli měření NDVI nebo stínu.<br><a href="https://www.openstreetmap.org/way/${e.id}" target="_blank" rel="noopener">Zdroj plochy ↗</a>`).addTo(greenLayer)}});
 if($('#greenToggle').checked)greenLayer.addTo(map);if($('#buildingToggle').checked){buildingLayer.addTo(map);outlineLayer.addTo(map)}$('#geoStatus').textContent=`OSM · stav 2. 11. 2026 · ${buildings} půdorysů, ${green} zelených ploch a ${trees} jednotlivých stromů ve výběru. Evidence zeleně není úplná; zobrazeny jsou celé prvky zasahující svými body do okruhu.`;
}
const oldDrawMap = drawMap;
drawMap = function(fit) {
  oldDrawMap(fit);
  if (!map) return;
  const shown = places.filter(point => place === 'both' || point.id === place);
  circles.forEach(circle => circle.setStyle({fillOpacity: mode === 'air' ? 0.045 : 0}));
  labels.forEach((label, index) => {
    const point = shown[index];
    const reading = weather.find(item => item.id === point.id);
    const stale = weatherIsStale(reading);
    const temperature = reading ? fmt(reading.temp, 1) + ' °C' : '—';
    const timestamp = reading ? `${stale ? 'Starší údaj · ' : ''}${reading.time}` : 'Načítání / nedostupné';
    label.setIcon(L.divIcon({
      className: 'livepoint tempLabel',
      html: `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;background:${reading ? color(reading.temp) : '#aab6ae'}"></span>` +
        `${point.id === 'school' ? 'Škola' : 'OV'} · ${temperature}` +
        `<div style="font-size:10px;font-weight:400;color:#526480">Vzduch · modelový odhad</div>` +
        `<div style="font-size:10px;font-weight:400;color:${stale ? '#9a6034' : '#526480'}">${timestamp}</div>`
    }));
    label.bindPopup(liveWeatherPopup(point, reading));
  });
  renderGeo();
};
$('#greenToggle').onchange=renderGeo;$('#buildingToggle').onchange=renderGeo;
$('#zoomSchool').onclick=()=>{place='school';document.querySelectorAll('.place').forEach(b=>b.classList.toggle('active',b.dataset.place===place));drawMap();map?.setView([places[0].lat,places[0].lon],18)};
$('#zoomOv').onclick=()=>{place='ov';document.querySelectorAll('.place').forEach(b=>b.classList.toggle('active',b.dataset.place===place));drawMap();map?.setView([places[1].lat,places[1].lon],18)};
$('#zoomAll').onclick=()=>{place='both';document.querySelectorAll('.place').forEach(b=>b.classList.toggle('active',b.dataset.place===place));drawMap(true)};
$('#satelliteToggle').onchange=e=>{if(!map)return;if(e.target.checked){satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics and contributors'}).addTo(map);satellite.on('tileerror',()=>{$('#geoStatus').textContent='Letecký podklad se nepodařilo načíst. Vypněte jej pro návrat k základní mapě.'});}else if(satellite)map.removeLayer(satellite)};
fetch('map-features.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{geoData=j;drawMap();map?.setView([49.70945,12.778],16)}).catch(()=>{$('#geoStatus').textContent='Vrstva půdorysů a zeleně se nenačetla. Zkuste obnovit stránku.'});

// NASA GIBS: observational satellite surface-temperature imagery, not synthetic heat.
let thermalLayer,cityMode=false;
const baseIsNear=isNear;isNear=function(e,c){return cityMode?true:baseIsNear(e,c)};
function showThermal(){if(!map)return;if(thermalLayer)map.removeLayer(thermalLayer);cityMode=$('#cityLayer').value==='thermal';const info=$('#thermalInfo');info.hidden=!cityMode;if(!cityMode){renderGeo();return}const date=$('#thermalDate').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
 if(!map.getPane('thermalPane')){map.createPane('thermalPane');map.getPane('thermalPane').style.zIndex=350;map.getPane('thermalPane').style.pointerEvents='none'}
 thermalLayer=L.tileLayer.wms('https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi',{layers:'MODIS_Terra_Land_Surface_Temp_Day',format:'image/png',transparent:true,version:'1.1.1',time:date,opacity:+$('#thermalOpacity').value/100,pane:'thermalPane',maxZoom:19,attribution:'Surface temperature: NASA GIBS / MODIS Terra'}).addTo(map);
 info.innerHTML=`<b>Družicová teplota povrchu · ${escapeHtml(date)}</b><br><img src="https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.png" alt="Oficiální barevná stupnice NASA pro teplotu povrchu" style="display:block;max-width:100%;margin:10px 0">NASA GIBS / MODIS Terra, denní snímek, rozlišení přibližně 1 km. Barvy zachycují teplotu povrchu v době pozorování, nikoli současnou teplotu vzduchu. Průhledná místa mohou znamenat oblačnost nebo chybějící pozorování. Při prázdné vrstvě zvolte jiný den. Datum je požadované, nikoli potvrzení dostupného snímku.<br><b>Budovy a plochy jsou orientační vrstvou OSM, nikoli katastrálními parcelami.</b> Hodnoty pro jednotlivé nemovitosti tento rastr nerozliší.<br><a href="https://worldview.earthdata.nasa.gov/?v=12.72,49.68,12.83,49.74&l=MODIS_Terra_Land_Surface_Temp_Day&t=${date}" target="_blank" rel="noopener">Otevřít stejnou vrstvu v NASA Worldview ↗</a>`;
 thermalLayer.on('tileerror',()=>{info.innerHTML='<b>Družicovou vrstvu se nepodařilo načíst.</b> Zkuste jiné datum nebo NASA Worldview. Budovy, zeleň a aktuální počasí zůstávají oddělené vrstvy.'});renderGeo();map.fitBounds([[49.697,12.758],[49.722,12.797]],{padding:[10,10]});}
$('#cityLayer').onchange=showThermal;$('#thermalDate').onchange=()=>{if(cityMode)showThermal()};$('#thermalOpacity').oninput=()=>thermalLayer?.setOpacity(+$('#thermalOpacity').value/100);
const previousRenderGeo=renderGeo;renderGeo=function(){previousRenderGeo();if(!map)return;[buildingLayer,greenLayer,outlineLayer].forEach(group=>group?.eachLayer(layer=>{if(!layer.getPopup)return;const popup=layer.getPopup();if(!popup||!cityMode)return;const w=weather[0];layer.bindPopup(popup.getContent()+`<hr><b>Teplota této nemovitosti: nedostupná.</b><br>Družicová vrstva má pixel přibližně 1 km; nelze mu přiřadit přesnou teplotu této budovy či plochy.${w?`<br>Kontext oblasti: vzduch ${fmt(w.temp,1)} °C (model ${w.time.replace('T',' ')}).`:''}<br>Nejde o individuální měření nemovitosti.`)}))};
$('#surface').onclick=()=>{$('#cityLayer').value='thermal';showThermal();$('#surface').classList.add('active');$('#air').classList.remove('active');$('#mapNote').textContent='Barevná plošná vrstva: družicová teplota povrchu NASA. Štítky školy a OV nadále uvádějí současnou modelovou teplotu vzduchu. Jde o dvě odlišné veličiny a časy.'};
$('#air').onclick=()=>{$('#cityLayer').value='off';showThermal();setMode('air')};
const originalShowThermal=showThermal;showThermal=function(){originalShowThermal();const ramp=document.querySelector('.mapkey > span');if(ramp)ramp.hidden=cityMode;$('#mapTitle').textContent=cityMode?'Bor · přehledová družicová mapa města':'Škola a OV · dva okruhy do 1 000 m';if(cityMode)$('#geoStatus').textContent='Půdorysy a zelené plochy: dostupný výřez městské zástavby OSM (stav 2. 11. 2026), nikoli kompletní katastr města. Družicová vrstva pokrývá i širší okolí.'};

// Locally processed Landsat ST and QA, real surface-temperature values.
let detailData,detailOverlay,detailOn=false;
function sampleDetail(latlng){if(!detailData)return null;const b=detailData.bounds, x=Math.floor((latlng.lng-b[0])/(b[2]-b[0])*detailData.width), y=Math.floor((b[3]-latlng.lat)/(b[3]-b[1])*detailData.height);return x<0||y<0||x>=detailData.width||y>=detailData.height?null:detailData.temperature_C[y][x]}
function detailHtml(latlng){const t=sampleDetail(latlng);return `<b>${t===null?'V tomto místě není platná hodnota':fmt(t,1)+' °C · povrch'}</b><br>Landsat 9 · 12. 8. 2025, 11:57 SELČ<br>Souřadnice ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}<br><small>Hodnota okolního rastrového pixelu. Tepelné rozlišení cca 100 m; výstupní mřížka cca 30 m. Nejde o samostatné měření střechy či parcely ani o dnešní teplotu.</small>`}
const lastShowThermal=showThermal;showThermal=function(){if(!map)return;detailOn=$('#cityLayer').value==='detail';if(detailOverlay)map.removeLayer(detailOverlay);$('#detailReadout').hidden=!detailOn;$('#thermalDate').disabled=detailOn;$('#surface').classList.toggle('active',detailOn||$('#cityLayer').value==='thermal');$('#air').classList.toggle('active',$('#cityLayer').value==='off');if(!detailOn){lastShowThermal();return}if(thermalLayer)map.removeLayer(thermalLayer);cityMode=true;
 if(!detailData){$('#thermalInfo').hidden=false;$('#thermalInfo').textContent='Načítám podrobná data Landsat…';return}
 if(!map.getPane('detailPane')){map.createPane('detailPane');map.getPane('detailPane').style.zIndex=350;map.getPane('detailPane').style.pointerEvents='none'}
 const b=detailData.bounds;detailOverlay=L.imageOverlay('landsat-detail.png',[[b[1],b[0]],[b[3],b[2]]],{opacity:+$('#thermalOpacity').value/100,pane:'detailPane',interactive:false,attribution:'USGS Landsat 9 / Microsoft Planetary Computer · 12 Aug 2025'}).addTo(map);
 $('#mapTitle').textContent='Bor · podrobná teplota povrchu · 12. 8. 2025';$('#thermalInfo').hidden=false;$('#thermalInfo').innerHTML=`<b>Landsat 9 · skutečná teplota povrchu · 12. 8. 2025, 11:57 SELČ</b><div style="display:flex;align-items:center;gap:10px;margin:12px 0"><span>20 °C</span><span style="height:14px;flex:1;background:linear-gradient(90deg,rgb(38,58,180),rgb(0,137,225),rgb(0,212,187),rgb(134,232,65),rgb(255,240,25),rgb(255,143,0),rgb(225,25,24),rgb(124,0,31));border-radius:5px"></span><span>45 °C</span></div><b>Klikněte na libovolné místo pro teplotu.</b> Zpracovaný výřez: ${fmt(detailData.min_C,1)} až ${fmt(detailData.max_C,1)} °C, medián ${fmt(detailData.median_C,1)} °C. Tepelné rozlišení senzoru přibližně 100 m, dodávaný produkt 30 m. Výřez převzorkován nejbližším sousedem na buňky přibližně 28 × 28 m. Jemnější barevné zobrazení nepřidává měření. Neplatné pixely (oblačnost, stín, sníh) jsou průhledné. Chybějící místa se nedopočítávají.<br>Jde o jeden historický přelet, nikoli živou teplotu. Stejná hodnota může patřit více budovám. Půdorysy a zeleň nejsou katastrální parcely.<br><a href="thermal-detail.json" download>Stáhnout teplotní rastr a metodiku (JSON)</a> · <a href="landsat-scene.json" download>Metadata scény</a>`;
 const ramp=document.querySelector('.mapkey > span');if(ramp)ramp.hidden=true;
 $('#mapNote').textContent='Barevný podklad znázorňuje historickou teplotu povrchu. Štítky školy a OV ukazují dnešní modelovou teplotu vzduchu; nelze je přímo porovnávat.';renderGeo();$('#geoStatus').textContent='Půdorysy a zeleň OSM nad teplotním rastrem Landsat. Zelené plochy jsou mapové značky, jejich barva není teplotou. Vrstva Zeleň se dá vypnout pro nerušené čtení teploty.';
 map.fitBounds([[49.7035,12.768],[49.7155,12.788]],{padding:[10,10]});
};
$('#cityLayer').onchange=()=>showThermal();$('#thermalDate').onchange=()=>{if($('#cityLayer').value==='thermal')showThermal()};$('#thermalOpacity').oninput=()=>{detailOverlay?.setOpacity(+$('#thermalOpacity').value/100);thermalLayer?.setOpacity(+$('#thermalOpacity').value/100)};
$('#surface').onclick=()=>{$('#cityLayer').value='detail';showThermal()};$('#air').onclick=()=>{$('#cityLayer').value='off';showThermal();setMode('air')};
if(map)map.on('click',e=>{if(!detailOn||!detailData)return;const html=detailHtml(e.latlng);$('#detailReadout').innerHTML=html;L.popup({maxWidth:330}).setLatLng(e.latlng).setContent(html).openOn(map)});
fetch('thermal-detail.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{detailData=j;if($('#cityLayer').value==='detail')showThermal()}).catch(()=>{$('#detailReadout').textContent='Podrobná teplotní data se nenačetla. Zkuste obnovit stránku.'});
const drawBeforeDetail=drawMap;drawMap=function(fit){drawBeforeDetail(fit);if(detailOn&&detailData){$('#thermalDate').value='2025-08-12';labels.forEach((l,i)=>{const p=places.filter(p=>place==='both'||p.id===place)[i];const t=sampleDetail({lat:p.lat,lng:p.lon});l.setIcon(L.divIcon({className:'livepoint tempLabel',html:`<span style="display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;background:${t===null?'#aaa':color(t)}"></span>${p.id==='school'?'Škola':'OV'} · ${t===null?'bez dat':fmt(t,1)+' °C'}<div style="font-size:9px;font-weight:400;color:#66776d">Povrch · okolní pixel · 12. 8. 2025</div>`}));l.bindPopup(detailHtml({lat:p.lat,lng:p.lon}))});$('#mapNote').textContent='Barvy i štítky školy a OV ukazují historickou teplotu povrchu z 12. 8. 2025. Hodnota je odečtena z okolního pixelu, nikoli změřena samostatně na konkrétní střeše.'}};
const showBeforeMarker=showThermal;showThermal=function(){showBeforeMarker();if(detailOn&&detailData)drawMap()};$('#cityLayer').onchange=()=>showThermal();
if(detailData&&detailOn)drawMap();

