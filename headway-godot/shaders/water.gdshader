shader_type spatial;
render_mode cull_disabled,depth_draw_always;
#include "res://shaders/common.gdshaderinc"
varying float depth;
varying vec3 wpos;
float wv(vec2 q,float t){return vnoise(q/16.+vec2(t*.06,t*.035))+.55*vnoise(q/5.5-vec2(t*.11,-t*.07))+.25*vnoise(q/1.7+vec2(t*.3,t*.2));}
void vertex(){depth=COLOR.r*30.;wpos=(MODEL_MATRIX*vec4(VERTEX,1.)).xyz;}
void fragment(){
	vec2 p=wpos.xz;float e=.6;
	vec3 nw=normalize(vec3(-(wv(p+vec2(e,0),TIME)-wv(p-vec2(e,0),TIME))*.5,1.,-(wv(p+vec2(0,e),TIME)-wv(p-vec2(0,e),TIME))*.5));
	NORMAL=normalize((VIEW_MATRIX*vec4(nw,0.)).xyz);
	vec3 shallow=lin(vec3(.16,.42,.42)),deep=lin(vec3(.02,.12,.18));
	float foam=(1.-smoothstep(0.,.8,depth))*(.5+.5*vnoise(p/2.+TIME*.3));
	ALBEDO=mix(mix(shallow,deep,smoothstep(0.,10.,depth)),vec3(.8),foam*.6);
	ROUGHNESS=.04;SPECULAR=.6;METALLIC=0.;
	ALPHA=clamp(mix(.5,.94,smoothstep(0.,5.,depth))+foam*.3,0.,1.);
}
