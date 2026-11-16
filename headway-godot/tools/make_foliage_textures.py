"""Generates the foliage card textures used by the tree models (run once; output in ../textures)."""
import math, random, os
from PIL import Image, ImageDraw, ImageFilter
OUT=os.path.join(os.path.dirname(__file__),'..','textures');S=1024;F=512
def col(base,var,r):return tuple(max(0,min(255,int(c+(r.random()*2-1)*v))) for c,v in zip(base,var))+(255,)
def save(img,name):
    img=img.resize((F,F),Image.LANCZOS);a=img.split()[3]
    # bleed colour into transparent pixels so mipmaps do not get dark halos
    rgb=img.convert('RGB');bl=rgb.filter(ImageFilter.GaussianBlur(6));m=a.point(lambda v:255 if v>8 else 0)
    out=Image.composite(rgb,bl,m).convert('RGBA');out.putalpha(a);out.save(os.path.join(OUT,name))
def needles(d,x,y,ang,length,count,step,spread,base,var,r,w=2):
    for i in range(count):
        t=i*step;px=x+math.cos(ang)*t;py=y+math.sin(ang)*t
        for s in (-1,1):
            a=ang+s*spread*(0.8+0.4*r.random());L=length*(0.75+0.5*r.random())*(1-0.35*i/count)
            d.line([(px,py),(px+math.cos(a)*L,py+math.sin(a)*L)],fill=col(base,var,r),width=w)
def spruce(name,base,var,seed):
    r=random.Random(seed);img=Image.new('RGBA',(S,S),(0,0,0,0));d=ImageDraw.Draw(img);cy=S/2
    d.line([(0,cy),(S*.97,cy+20)],fill=(70,52,38,255),width=10)
    for k in range(16):
        x=40+k*58;L=(330*(1-k/18)+60)*(0.8+0.3*r.random())
        for s in (-1,1):
            a=s*math.radians(42+r.random()*16);ex=x+math.cos(a)*L*0.75;ey=cy+math.sin(a)*L*0.75
            d.line([(x,cy),(ex,ey)],fill=(66,50,36,255),width=4)
            needles(d,x,cy,a,26,int(L/7),7,math.radians(58),base,var,r,3)
    needles(d,0,cy,math.radians(1.2),30,int(S*.95/6),6,math.radians(60),base,var,r,3)
    save(img,name)
def tufts(name,base,var,seed,burst,length,n,spread=110):
    r=random.Random(seed);img=Image.new('RGBA',(S,S),(0,0,0,0));d=ImageDraw.Draw(img);cy=S/2
    d.line([(0,cy),(S*.92,cy-30)],fill=(80,58,40,255),width=12)
    for k in range(n):
        x=80+k*(S*.8/n);y=cy-30*x/S+(r.random()-.5)*120
        for j in range(burst):
            a=math.radians(-spread/2+r.random()*spread)+(-0.1 if j%2 else 0.1);L=length*(0.6+0.6*r.random())
            d.line([(x,y),(x+math.cos(a)*L,y+math.sin(a)*L*1.2)],fill=col(base,var,r),width=3)
            a2=a+math.pi+ (r.random()-.5)*.6
            if r.random()<.6:d.line([(x,y),(x+math.cos(a2)*L*.8,y+math.sin(a2)*L)],fill=col(base,var,r),width=3)
    save(img,name)
def leaves(name,base,var,seed,n,lw,lh,radius,berries=0):
    r=random.Random(seed);img=Image.new('RGBA',(S,S),(0,0,0,0));d=ImageDraw.Draw(img);c=S/2
    for k in range(9):
        a=k/9*math.tau+r.random()*.4;d.line([(c,c+radius*.9),(c+math.cos(a)*radius*.85,c+math.sin(a)*radius*.85)],fill=(80,62,48,255),width=5)
    for i in range(n):
        rr=radius*math.sqrt(r.random());a=r.random()*math.tau;x=c+math.cos(a)*rr;y=c+math.sin(a)*rr*0.92
        ang=r.random()*math.tau;w=lw*(0.75+0.5*r.random());h=lh*(0.75+0.5*r.random())
        pts=[];
        for t in range(14):
            q=t/14*math.tau;px=math.cos(q)*w/2;py=math.sin(q)*h/2*(1-0.35*math.cos(q))
            pts.append((x+px*math.cos(ang)-py*math.sin(ang),y+px*math.sin(ang)+py*math.cos(ang)))
        shade=0.75+0.5*(1-rr/radius)*r.random()
        cc=col(tuple(v*shade for v in base),var,r);d.polygon(pts,fill=cc)
        d.line([pts[0],pts[7]],fill=tuple(max(0,v-25) for v in cc[:3])+(255,),width=1)
    for b in range(berries):
        a=r.random()*math.tau;rr=radius*(.3+.5*r.random());bx=c+math.cos(a)*rr;by=c+math.sin(a)*rr
        for j in range(16):
            ox=(r.random()-.5)*60;oy=(r.random()-.5)*45;R=9+r.random()*4
            d.ellipse([bx+ox-R,by+oy-R,bx+ox+R,by+oy+R],fill=col((196,40,22),(25,12,8),r))
    save(img,name)
os.makedirs(OUT,exist_ok=True)
spruce('spruce.png',(38,74,46),(14,20,14),1)
tufts('pine.png',(46,72,44),(12,16,12),2,46,250,12,170)
tufts('larch.png',(108,140,64),(18,20,14),3,40,150,20,175)
leaves('birch.png',(112,150,64),(22,24,16),4,520,40,26,430)
leaves('broad.png',(70,108,46),(16,20,12),5,380,62,40,440)
leaves('rowan.png',(78,116,50),(16,20,12),6,420,46,20,430,berries=4)
leaves('shrub.png',(72,104,48),(18,22,14),7,460,38,26,450)
print('ok')
