import numpy as np
from PIL import Image
# hue classes of the key palette
CLS=[('ball',5,32),('skin',36,72),('shoe2',88,152),('trim',165,220),('hair',223,262),('jersey',266,345)]
KEY={'skin':'#d8b25a','shoe2':'#33c24a','trim':'#2bb3d6','hair':'#4b4bd2','jersey':'#c42bc4'}
def hx(h):h=h.lstrip('#');return np.array([int(h[i:i+2],16) for i in (0,2,4)],np.float32)/255
def classify(a):
    rgb=a[...,:3];mx=rgb.max(-1);mn=rgb.min(-1);d=mx-mn
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    with np.errstate(divide='ignore',invalid='ignore'):
        h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
        sat=np.where(mx>0,d/mx,0)
    h=np.nan_to_num(h)%360
    ok=(a[...,3]>0.02)&(sat>0.18)&(mx>0.08)
    out=np.zeros(a.shape[:2],np.uint8)
    for k,(n,lo,hi) in enumerate(CLS,1): out[ok&(h>=lo)&(h<=hi)]=k
    return out,mx
def tint(a,cols):
    """a float RGBA 0..1; cols dict class->hex"""
    c,mx=classify(a);o=a.copy()
    for k,(n,lo,hi) in enumerate(CLS,1):
        if n not in cols: continue
        m=c==k
        if not m.any(): continue
        ref=hx(KEY[n]).max()*0.92;f=(mx[m]/ref)[:,None];t=hx(cols[n])
        o[m,:3]=np.where(f<=1,t*f,np.minimum(1,t+(1-t)*(f-1)*0.45))
    return o
def load(p): return np.asarray(Image.open(p).convert('RGBA'),np.float32)/255
def over(dst,src):
    a=src[...,3:4];o=dst.copy();o[...,:3]=src[...,:3]*a+dst[...,:3]*(1-a);o[...,3:4]=a+dst[...,3:4]*(1-a);return o
def toimg(a): return Image.fromarray((np.clip(a,0,1)*255+0.5).astype(np.uint8))
