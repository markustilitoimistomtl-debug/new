shader_type spatial;
render_mode cull_disabled;
#include "res://shaders/common.gdshaderinc"
uniform sampler2D land_tex : filter_nearest;
uniform vec3 pal[20];
uniform float n_cells = 512.0;
uniform float cell_size = 10.0;
uniform float exag = 1.6;
uniform vec4 rw0; // centre x, z, direction x, z
uniform vec4 rw1; // half length, half width
uniform vec4 rw2; // apron along, across
varying vec3 wpos;
varying vec3 wnrm;

int land_at(vec2 c){ivec2 i=clamp(ivec2(floor(c+.5)),ivec2(0),ivec2(int(n_cells)-1));return int(texelFetch(land_tex,i,0).r*255.+.5);}

vec3 ground(int t,vec2 p,float y,inout float wet){
	vec3 b=pal[t];float n1=vnoise(p/6.),n2=fbm(p/45.),n3=vnoise(p/1.3),n4=vnoise(p/.45);
	vec3 moss=mix(lin(vec3(.36,.42,.18)),lin(vec3(.47,.5,.24)),n1)*(.82+.3*n3);
	vec3 heath=mix(lin(vec3(.42,.36,.2)),lin(vec3(.36,.3,.22)),n4);
	if(t==0||t==10){vec3 c=mix(lin(vec3(.25,.29,.14)),lin(vec3(.34,.29,.18)),smoothstep(.35,.7,n2));c=mix(c,moss,.45*smoothstep(.4,.8,n1));return c*(.82+.3*n4);}
	if(t==13){vec3 c=mix(moss,heath,smoothstep(.45,.75,n2));return mix(c,lin(vec3(.52,.5,.3)),.25*smoothstep(.6,.9,n3))*(.85+.25*n4);}
	if(t==14){vec3 c=mix(lin(vec3(.42,.5,.22)),lin(vec3(.52,.56,.27)),n2)*(.85+.25*n3);float f=step(.985,hash2(floor(p/.22)))*step(.55,vnoise(p/7.));return mix(c,(hash2(floor(p/.22)+7.)>.5)?lin(vec3(.92,.84,.35)):lin(vec3(.9,.9,.92)),f);}
	if(t==15){vec3 c=mix(lin(vec3(.4,.33,.22)),moss,smoothstep(.5,.8,n2)*.7)*(.75+.45*n3);return c*(1.-.35*step(.93,hash2(floor(p/2.))));}
	if(t==16){if(fbm(p/22.)>.6){wet=1.;return lin(vec3(.12,.2,.22));}return mix(moss,lin(vec3(.36,.46,.38)),.5)*(.8+.3*n1);}
	if(t==17)return b*(.65+.55*fbm(p/14.))*(.88+.12*sin(y*.4+n1*2.));
	if(t==18)return lin(vec3(.78,.72,.55))*(.9+.1*sin(p.x*.7+p.y*.35+n1*4.))*(.92+.1*n4);
	if(t==8||t==9)return mix(lin(vec3(.48,.43,.33)),b,.25)*(.8+.3*n1);
	if(t==11||t==19)return b*(.92+.08*n1);
	if(t==7){vec2 fc=floor((p+vec2(29.,11.))/72.);float r=hash2(fc+3.7);vec3 c=(r<.3)?lin(vec3(.79,.7,.42)):((r<.55)?lin(vec3(.5,.62,.3)):((r<.8)?lin(vec3(.55,.43,.3)):lin(vec3(.7,.68,.36))));return c*(.88+.14*step(.5,fract(((hash2(fc+9.1)>.5)?p.x:p.y)/3.2)))*(.9+.15*n2);}
	if(t==12)return b*(.88+.16*sin(p.x/11.+n2*7.+p.y/23.));
	return mix(lin(vec3(.5,.52,.48)),moss,.4)*(.85+.25*n1);
}
vec3 runway_paint(vec2 p,vec3 alb){
	vec2 d=rw0.zw,q=p-rw0.xy;float al=dot(q,d),ac=dot(q,vec2(-d.y,d.x)),ea=abs(al)-rw1.x,ec=abs(ac)-rw1.y;
	vec3 grav=lin(vec3(.57,.53,.46))*(.84+.26*vnoise(p/1.7))*(.92+.12*vnoise(p/9.));
	float ap=max(abs(al-rw2.x)-18.,abs(ac-rw2.y)-14.);if(ap<4.)alb=mix(alb,grav*.95,smoothstep(4.,0.,ap));
	if(ea<5.&&ec<6.){alb=mix(alb,grav,smoothstep(6.,0.,max(ea,ec)));if(ea<0.&&ec<0.){alb=lin(vec3(.31,.31,.3))*(.86+.2*vnoise(p/2.3))*(.95+.08*vnoise(p/14.));
		if(abs(ac)<.35&&fract(al/30.)<.5&&ea<-26.)alb=lin(vec3(.9,.9,.85));if(abs(abs(ac)-rw1.y+.7)<.22)alb=lin(vec3(.86,.86,.82));
		if(ea>-16.&&ea<-5.&&fract((ac+rw1.y)/2.3)<.5&&abs(ac)<rw1.y-1.6)alb=lin(vec3(.9,.9,.86));}}
	return alb;
}
void vertex(){wpos=(MODEL_MATRIX*vec4(VERTEX,1.)).xyz;wnrm=normalize((MODEL_MATRIX*vec4(NORMAL,0.)).xyz);}
void fragment(){
	vec2 p=wpos.xz;vec2 c=p/cell_size+(n_cells-1.)*.5+(vec2(vnoise(p/(.9*cell_size)),vnoise(p/(.9*cell_size)+31.7))-.5)*.95;
	int t=land_at(c);float wet=0.;vec3 alb=ground(t,p,wpos.y/exag,wet);
	float sl=1.-wnrm.y;if(t!=8&&t!=9)alb=mix(alb,lin(vec3(.47,.46,.43))*(.7+.5*fbm(p/10.)),smoothstep(.42,.62,sl));
	alb=runway_paint(p,alb);
	ALBEDO=alb;ROUGHNESS=mix(.95,.2,wet);SPECULAR=mix(.3,.6,wet);
}
