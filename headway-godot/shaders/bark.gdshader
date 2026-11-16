shader_type spatial;
render_mode cull_disabled;
#include "res://shaders/common.gdshaderinc"
varying vec3 lp;
varying float birch;
void vertex(){lp=VERTEX;birch=INSTANCE_CUSTOM.a;}
void fragment(){
	vec3 c=COLOR.rgb;float n=vnoise(vec2(atan(lp.z,lp.x)*3.,lp.y*60.));
	if(birch>.5){c=lin(vec3(.88,.87,.82));float m=step(.78,vnoise(vec2(atan(lp.z,lp.x)*2.,lp.y*90.)));c=mix(c,lin(vec3(.12,.11,.1)),m*.85);c=mix(c,lin(vec3(.3,.28,.26)),smoothstep(.12,0.,lp.y));}
	ALBEDO=c*(1.25+.5*n);ROUGHNESS=.95;
}
