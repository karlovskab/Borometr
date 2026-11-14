"""Publish original CHMI station observations, without modelling or interpolation."""
import concurrent.futures
import datetime as dt
import json
import math
import os
from pathlib import Path
import re
import urllib.error
import urllib.request

BASE='https://opendata.chmi.cz/meteorology/climate/now/'
AGENT='BORometr/1.0 (school weather viewer; https://karlovskab.github.io/Borometr/)'
ACCEPTED_QUALITY={0,5}  # 5 is operational data of unknown/unverified quality, never labelled verified.
ELEMENTS={'T','H','F','SRA10M'}

def get(url):
    request=urllib.request.Request(url,headers={'User-Agent':AGENT})
    with urllib.request.urlopen(request,timeout=25) as response:
        raw=response.read()
    return raw

def records(doc):
    data=doc['data']['data']
    return [dict(zip(data['header'].split(','),row)) for row in data['values']]

def number(value):
    return isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)

def parse_observation(doc,wsi):
    rows=[r for r in records(doc) if r.get('STATION')==wsi and r.get('ELEMENT') in ELEMENTS]
    valid=[r for r in rows if number(r.get('VAL')) and r.get('QUALITY') in ACCEPTED_QUALITY]
    temperatures=[r for r in valid if r['ELEMENT']=='T']
    if not temperatures:return None
    temperature=max(temperatures,key=lambda r:r['DT'])
    timestamp=temperature['DT']
    # Keep all displayed variables at the actual temperature observation's timestamp.
    values={r['ELEMENT']:{'value':r['VAL'],'quality':int(r['QUALITY']),'flag':r.get('FLAG','')} for r in valid if r['DT']==timestamp}
    return {'time':timestamp,'temperature_C':temperature['VAL'],'temperature_quality':int(temperature['QUALITY']),'elements':values,'source_created_at':doc.get('datumVytvoreni')}

def collect(output):
    now=dt.datetime.now(dt.timezone.utc)
    listing=get(BASE+'metadata/').decode('utf-8')
    choices=sorted(set(re.findall(r'meta1-(\d{8})\.json',listing)),reverse=True)
    if not choices:raise RuntimeError('CHMI metadata directory has no station index')
    day=choices[0]
    meta1_url=BASE+'metadata/meta1-'+day+'.json'
    meta2_url=BASE+'metadata/meta2-'+day+'.json'
    meta1=json.loads(get(meta1_url));meta2=json.loads(get(meta2_url))
    programs={r['WSI']:r for r in records(meta2) if r.get('OBS_TYPE')=='10M' and r.get('EG_EL_ABBREVIATION')=='T' and r.get('UN_DESCRIPTION')=='°C'}
    stations=[r for r in records(meta1) if r['WSI'] in programs and number(r.get('GEOGR1')) and number(r.get('GEOGR2'))]
    previous={}
    if output.exists():
        try:previous={r['id']:r for r in json.loads(output.read_text())['stations']}
        except (KeyError,ValueError):pass
    dates=[(now-dt.timedelta(days=offset)).strftime('%Y%m%d') for offset in (0,1)]
    def fetch_station(station):
        wsi=station['WSI'];observation=None
        result={'id':wsi,'code':station['GH_ID'],'name':station['FULL_NAME'],'latitude':station['GEOGR2'],'longitude':station['GEOGR1'],'elevation_m':station['ELEVATION'],'sensor_height_m':programs[wsi].get('HEIGHT'),'observation':None}
        for date in dates:
            url=BASE+'data/10m-'+wsi+'-'+date+'.json'
            try:
                doc=json.loads(get(url));observation=parse_observation(doc,wsi)
                if observation:
                    observation['source_url']=url;result['observation']=observation;return result
            except (urllib.error.URLError,TimeoutError,ValueError,KeyError):continue
        if wsi in previous and previous[wsi].get('observation'):
            result['observation']=previous[wsi]['observation']
            result['retained_previous_download']=True
        return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(fetch_station,stations))
    measured=sum(bool(s['observation']) for s in results)
    if measured<min(20,len(stations)//2):raise RuntimeError('Too few station measurements; preserving previous snapshot')
    payload={'provider':'Český hydrometeorologický ústav (ČHMÚ)','license':'CC BY 4.0','generated_at':now.isoformat(),'metadata_date':day,'metadata_sources':[meta1_url,meta2_url],'quality_source':BASE+'metadata/meta4-'+day+'.json','method':'Original 10-minute station T observations. Accepted QUALITY 0 (good) or 5 (unknown/unverified operational quality). Explicit estimates (3), suspect (1), poor (2), missing (4), non-numeric values excluded. No interpolation, model, altitude correction or filled gaps. Other variables must match T timestamp.','provider_publication':'CHMI now files are published hourly and contain 10-minute observations. Scheduled downloads can be delayed. Observation time is authoritative.','station_count':len(results),'stations_with_measurements':measured,'stations':results}
    output.parent.mkdir(parents=True,exist_ok=True)
    temp=output.with_suffix('.tmp');temp.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')));os.replace(temp,output)
    print(f'CHMI: {measured}/{len(results)} stations with measured temperature; snapshot {payload["generated_at"]}')

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=Path('docs/chmi-observations.json'));args=parser.parse_args();collect(args.output)
