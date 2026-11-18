# Rebuild lipsync/index.html: slice.py -> shirt.py -> pack sprites -> inline into template.html
# Run from lipsync/tools:  python3 slice.py original-spacesuit.webp && python3 shirt.py && python3 build.py
from PIL import Image
import base64
G=4
bg=Image.new('RGBA',(10*(128+G),6*(124+G)),(0,0,0,0))
for r in range(6):
    for c in range(10):
        bg.paste(Image.open(f'out/r{r}c{c}.png'),(c*(128+G)+G//2,r*(124+G)+G//2))
bg.save('../sprites.png',optimize=True); bg.save('../sprites.webp',quality=92,method=6)
d=base64.b64encode(open('../sprites.webp','rb').read()).decode()
open('../index.html','w').write(open('template.html').read().replace('__SPRITES__','data:image/webp;base64,'+d))
