from PIL import Image, ImageDraw, ImageFilter
import numpy as np, glob, os
from scipy import ndimage
S=8; W,H=128,124
INK=(24,18,12,255); WHITE=(247,245,240,255); SHADE=(214,214,210,255); SKIN=(229,212,180,255); SKIN_SH=(200,180,148,255)
def bez(pts,n=24):
    # pts: list of segments; each segment: (p0,c,p1) quadratic or (p0,p1) line
    out=[]
    for seg in pts:
        if len(seg)==2:
            out+= [seg[0],seg[1]]
        else:
            p0,c,p1=seg
            for i in range(n+1):
                t=i/n; out.append(((1-t)**2*p0[0]+2*(1-t)*t*c[0]+t*t*p1[0],(1-t)**2*p0[1]+2*(1-t)*t*c[1]+t*t*p1[1]))
    return [(x*S,y*S) for x,y in out]
def poly(d,segs,fill=None,outline=True,w=2.0):
    p=bez(segs)
    if fill: d.polygon(p,fill=fill)
    if outline: d.line(p+[p[0]] if fill else p,fill=INK,width=int(w*S),joint='curve')
def mirror(segs): return [tuple((128-x,y) for x,y in s) for s in segs]

def body():
    im=Image.new('RGBA',(W*S,H*S),(0,0,0,0)); d=ImageDraw.Draw(im)
    # shirt torso
    torso=[((40,86),(24,94),(12,102)),((12,102),(6,112),(4,126)),((4,126),(124,126)),((124,126),(122,112),(116,102)),((116,102),(104,94),(88,86))]
    poly(d,torso,fill=WHITE)
    # back of collar band (behind neck)
    poly(d,[((44,74),(64,82),(84,74)),((84,74),(90,84)),((90,84),(64,94),(38,84)),((38,84),(44,74))],fill=WHITE)
    # neck
    neck=[((47,64),(48,80),(50,90)),((50,90),(64,104)),((64,104),(78,90)),((78,90),(80,80),(82,64))]
    poly(d,neck,fill=SKIN,outline=False)
    d.line(bez([((47,64),(48,80),(51,92))]),fill=INK,width=int(1.8*S),joint='curve')
    d.line(bez([((82,64),(80,80),(77,92))]),fill=INK,width=int(1.8*S),joint='curve')
    # shadow under collar on neck (V)
    poly(d,[((52,94),(64,106)),((64,106),(76,94)),((76,94),(64,100),(52,94))],fill=SKIN_SH,outline=False)
    # shading on shirt under wings
    for segs in ([((38,90),(30,100),(34,108)),((34,108),(48,116),(56,114)),((56,114),(46,104),(38,90))],):
        poly(d,segs,fill=SHADE,outline=False); poly(d,mirror(segs),fill=SHADE,outline=False)
    # placket + buttons
    d.line(bez([((64,104),(64,126))]),fill=INK,width=int(1.3*S))
    d.line(bez([((67,106),(67,126))]),fill=(190,190,186,255),width=int(1*S))
    for by in (112,121):
        d.ellipse([(65.5-1.6)*S,(by-1.6)*S,(65.5+1.6)*S,(by+1.6)*S],fill=(235,233,228,255),outline=INK,width=int(0.8*S))
    # collar wings
    L=[((45,72),(44,80),(36,88)),((36,88),(42,100),(50,112)),((50,112),(57,106),(64,104)),((64,104),(54,92),(45,72))]
    poly(d,L,fill=WHITE); poly(d,mirror(L),fill=WHITE)
    # fold crease hint
    d.line(bez([((42,90),(46,98),(50,106))]),fill=(200,200,196,255),width=int(1*S))
    d.line(bez(mirror([((42,90),(46,98),(50,106))])),fill=(200,200,196,255),width=int(1*S))
    # shoulder seams
    d.line(bez([((24,96),(20,108),(18,126))]),fill=(205,205,200,255),width=int(1*S))
    d.line(bez(mirror([((24,96),(20,108),(18,126))])),fill=(205,205,200,255),width=int(1*S))
    return im.resize((W,H),Image.LANCZOS)

B=body(); B.save('body.png')
CUT=74
os.makedirs('out',exist_ok=True)
for f in sorted(glob.glob('cells/*.png')):
    a=np.array(Image.open(f).convert('RGBA')).astype(int)
    r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
    skin=(al>150)&(r>175)&(g>145)&(b>105)&(r>b+28)
    yy=np.arange(H)[:,None].repeat(W,1)
    lab,n=ndimage.label(skin)
    keep=set(np.unique(lab[(yy<=CUT+2)&skin]))-{0}
    face=np.isin(lab,list(keep))&(yy>=CUT-2)
    face=ndimage.binary_fill_holes(face|( (yy<CUT)&(al>0) ))&(yy>=CUT-2)
    Z=4
    f4=ndimage.zoom(face.astype(float),Z,order=1)
    f4=ndimage.gaussian_filter(f4,2.5)>0.5
    y4=np.arange(H*Z)[:,None]
    fm=f4.reshape(H,Z,W,Z).mean((1,3))
    fm[yy<CUT]=1.0
    band=ndimage.binary_dilation(f4,iterations=3)&~ndimage.binary_erosion(f4,iterations=3)
    band&=(y4>(CUT+3)*Z)
    k=band.reshape(H,Z,W,Z).mean((1,3))*np.clip((yy-(CUT+3))/4.0,0,1)
    out=np.array(B).astype(float); src=a.astype(float)
    sa=(src[...,3]/255.0*fm)[...,None]
    rgb=src[...,:3]*sa+out[...,:3]*(1-sa)
    alpha=src[...,3:4]*sa+out[...,3:4]*(1-sa)
    alpha=np.maximum(alpha,src[...,3:4]*sa)
    ink=np.array(INK[:3],float)
    rgb=rgb*(1-k[...,None])+ink*k[...,None]
    alpha=np.maximum(alpha,255*k[...,None])
    res=np.concatenate([rgb,alpha],-1).clip(0,255).astype(np.uint8)
    Image.fromarray(res).save('out/'+os.path.basename(f))
