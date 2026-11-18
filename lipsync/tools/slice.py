from PIL import Image
import sys
im=Image.open(sys.argv[1]).convert('RGBA')
cx=[(19+138)/2,(155+272)/2,(290+408)/2,(425+544)/2,(561+680)/2,(695+814)/2,(830+949)/2,(966+1084)/2,(1101+1219)/2,(1237+1355)/2]
ry=[(20,138),(145,263),(270,388),(394,511),(517,632),(637,761)]
W,H=128,124
import os; os.makedirs('cells',exist_ok=True)
for r,(y0,y1) in enumerate(ry):
  for c,x in enumerate(cx):
    x0=int(round(x-W/2)); top={0:99,1:225,2:350,3:474,4:597,5:716}[r]-83
    cell=im.crop((x0,top,x0+W,top+H))
    cell.save(f'cells/r{r}c{c}.png')
