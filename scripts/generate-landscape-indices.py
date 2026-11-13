import sys,json,math,shutil
import tifffile,numpy as np
from PIL import Image
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'docs';base=out/'source-data'
a={n:tifffile.imread(base/({'qa_pixel':'landsat-qa.tif'}.get(n,'landsat-'+n+'.tif'))) for n in ['red','nir08','qa_radsat','qa_pixel']}
r=a['red'][:,:,0]*.0000275-.2;n=a['nir08'][:,:,0]*.0000275-.2
mask=((a['qa_pixel'][:,:,0]&63)==0)&(a['qa_radsat'][:,:,0]==0)&(r+n>0)
for ar in a.values():mask&=ar[:,:,1]>0
v=(n-r)/np.where(n+r!=0,n+r,1);mask&=(v>=-1)&(v<=1)
v=np.where(mask,v,np.nan)
t=json.loads((out/'thermal-detail.json').read_text());T=np.array(t['temperature_C'],dtype=float);b=t['bounds']
lon=b[0]+(np.arange(100)+.5)*(b[2]-b[0])/100;lat=b[3]-(np.arange(100)+.5)*(b[3]-b[1])/100;xx,yy=np.meshgrid(lon,lat)
zones=[]
for key,name,la,lo in [('school','Okruh hlavní školy · 1 000 m',49.7108382,12.7771834),('ov','Okruh pracoviště OV · 1 000 m',49.7080373,12.7789787),('all','Celý dostupný výřez',None,None)]:
 if la is None: sel=np.ones((100,100),bool)
 else:
  dlat=np.radians(yy-la);dlon=np.radians(xx-lo);h=np.sin(dlat/2)**2+np.cos(np.radians(la))*np.cos(np.radians(yy))*np.sin(dlon/2)**2;sel=2*6371000*np.arcsin(np.sqrt(h))<=1000
 tv=T[sel&np.isfinite(T)];nv=v[sel&np.isfinite(v)]
 zones.append(dict(id=key,name=name,cells=int(sel.sum()),temperature_valid=int(len(tv)),temperature_coverage_pct=float(len(tv)/sel.sum()*100),min_C=float(tv.min()),max_C=float(tv.max()),median_C=float(np.median(tv)),p10_C=float(np.percentile(tv,10)),p90_C=float(np.percentile(tv,90)),hot35_pct=float((tv>=35).mean()*100),ndvi_valid=int(len(nv)),ndvi_coverage_pct=float(len(nv)/sel.sum()*100),ndvi_median=float(np.median(nv)),ndvi_high_pct=float((nv>=.5).mean()*100)))
data=dict(scene=t['scene'],acquired=t['acquired'],bounds=b,width=100,height=100,source='USGS Landsat Collection 2 Level-2 / Microsoft Planetary Computer',formula='NDVI = (NIR − Red) / (NIR + Red); reflectance = DN × 0.0000275 − 0.2 before calculation',mask='QA_PIXEL bits 0–5 clear, QA_RADSAT = 0, valid source masks, positive denominator, NDVI in [-1,1]. No cloud-distance buffer.',resolution_m=30,zone_method='Cell centres within haversine 1000m circle; equal cell count weights. Raster statistics, no independent thermal samples; circles overlap. Full cutout is not the whole municipality.',thresholds='NDVI >= 0.5 is a project threshold for greener pixels, not tree canopy area. Surface >=35°C is a project comparison threshold, not a safety limit.',zones=zones,ndvi=[[round(float(x),4) if np.isfinite(x) else None for x in row] for row in v])
(out/'landscape-indices.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
stops=[(-1,(39,70,114)),(0,(183,162,125)),(.2,(230,213,158)),(.5,(126,184,90)),(.8,(27,115,65)),(1,(0,65,39))];img=np.zeros((100,100,4),np.uint8)
for k in range(3):img[:,:,k]=np.interp(np.nan_to_num(v),[q[0] for q in stops],[q[1][k] for q in stops]).astype(np.uint8)
img[:,:,3]=mask.astype(np.uint8)*255;Image.fromarray(img).save(out/'landsat-ndvi.png')
assert all(z['cells']>0 and z['ndvi_valid']>0 for z in zones)
print(json.dumps(zones,ensure_ascii=False,indent=2))
