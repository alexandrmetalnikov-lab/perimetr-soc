# Перекраска волос Орловой в чёрный (06.11.2026): маска по полигонам вокруг волос, лицо и шея исключены,
# меняются только тёплые пиксели. Координаты подобраны под art-src/probes/p-orlova-brown.png (1024×1536).
# Запуск: python3 scripts/recolor-hair-orlova.py [вход] [выход]
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import sys
src=sys.argv[1] if len(sys.argv)>1 else 'art-src/probes/p-orlova-brown.png'
im=Image.open(src).convert('RGB'); W,H=im.size
def poly(pts, val=255, base=None):
    m=base or Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(pts,fill=val); return m
out=poly([(110,540),(140,380),(185,250),(240,140),(310,68),(420,42),(540,48),(645,82),(725,150),(775,240),(795,350),(795,480),(745,490),(735,330),(700,250),(655,218),(600,200),(540,203),(480,222),(430,265),(398,320),(398,430),(385,410),(330,398),(288,420),(282,480),(300,560),(350,588),(384,602),(370,700),(356,800),(180,800),(120,700)])
m=np.asarray(out,dtype=np.float32)/255
brow=poly([(398,302),(430,292),(500,300),(505,330),(400,334)]); brow=poly([(548,300),(600,292),(628,305),(625,328),(550,330)],base=brow)
b=np.asarray(brow,dtype=np.float32)/255*0.55
a=np.asarray(im,dtype=np.float32)/255
r,g,bl=a[...,0],a[...,1],a[...,2]
warm=np.clip((r-bl-0.02)/0.12,0,1)          # only warm (brown/orange) pixels, navy background stays
L=0.3*r+0.59*g+0.11*bl
shadow=np.array([0.055,0.05,0.07]); sheen=np.array([0.62,0.46,0.36])
t=np.clip(L,0,1)[...,None]**1.7
new=shadow+(sheen-shadow)*t
w=np.maximum(m,b)
w=np.asarray(Image.fromarray((w*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)),dtype=np.float32)/255
w=(w*warm)[...,None]
res=a*(1-w)+new*w
Image.fromarray((np.clip(res,0,1)*255).astype(np.uint8)).save(sys.argv[2] if len(sys.argv)>2 else 'art-src/portraits/p-orlova.png')
