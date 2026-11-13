import json,statistics,collections,pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'docs';raw=json.load(open(out/'source-data'/'bor-daily-era5land.json'));d=raw['daily'];g=collections.defaultdict(list);months=collections.defaultdict(list)
for date,t,mx in zip(d['time'],d['temperature_2m_mean'],d['temperature_2m_max']):
 if int(date[:4])>=2016:g[int(date[:4])].append((date,t,mx));months[date[:7]].append(t)
base=statistics.mean(statistics.mean(v[1] for v in g[y]) for y in range(2016,2021));annual=[]
for y,v in sorted(g.items()):
 assert len(v) in [365,366] and all(t is not None and mx is not None for _,t,mx in v)
 run=longest=0
 for _,t,mx in v:
  run=run+1 if mx>=30 else 0;longest=max(run,longest)
 annual.append({'year':y,'mean_C':statistics.mean(t for _,t,mx in v),'anomaly_C':statistics.mean(t for _,t,mx in v)-base,'summer_C':statistics.mean(t for dt,t,mx in v if dt[5:7] in ['06','07','08']),'summer_days':sum(mx>=25 for _,t,mx in v),'tropical_days':sum(mx>=30 for _,t,mx in v),'longest_hot_run_days':longest,'CDD18_C_days':sum(max(t-18,0) for _,t,mx in v),'monthly_C':[statistics.mean(months[f'{y}-{m:02d}']) for m in range(1,13)],'days':len(v)})
for i,r in enumerate(annual):r['rolling3_C']=statistics.mean(a['mean_C'] for a in annual[i-2:i+1]) if i>=2 else None
j={'period':'2016–2025','reference_period':'2016–2020','reference_mean_C':base,'source':'Open-Meteo / Copernicus ECMWF ERA5-Land','definitions':{'anomaly':'Annual mean minus mean of annual means 2016–2020; not a 30-year climate normal.','CDD18':'Sum max(daily mean air temperature − 18°C, 0), in °C·day. Indicative climatic cooling-degree index, not actual school energy consumption.','longest_hot_run':'Longest consecutive run of days with model Tmax ≥ 30°C. Project indicator, not an official heatwave definition.'},'annual':annual};(out/'climate-indices.json').write_text(json.dumps(j,ensure_ascii=False,separators=(',',':')))
print('climate indices saved',len(annual),base)
