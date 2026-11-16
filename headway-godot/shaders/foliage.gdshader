shader_type spatial;
render_mode cull_disabled,diffuse_lambert_wrap,specular_schlick_ggx;
#include "res://shaders/common.gdshaderinc"
uniform sampler2D leaf_tex : source_color,filter_linear_mipmap_anisotropic,repeat_disable;
uniform float wind = 1.0;
varying vec3 tint;
varying float hgt;
varying vec3 vn;
void vertex(){
	tint=INSTANCE_CUSTOM.rgb;hgt=VERTEX.y;
	vec3 o=(MODEL_MATRIX*vec4(0.,0.,0.,1.)).xyz;
	float s=sin(TIME*1.2+o.x*.13+o.z*.11)*.6+sin(TIME*2.9+o.x*.5+VERTEX.y*6.)*.25;
	VERTEX.xz+=vec2(s,s*.6)*VERTEX.y*VERTEX.y*.018*wind;
	vn=(MODELVIEW_MATRIX*vec4(NORMAL,0.)).xyz;
}
void fragment(){
	vec4 c=texture(leaf_tex,UV);
	ALPHA=c.a;ALPHA_SCISSOR_THRESHOLD=.45;
	vec3 col=c.rgb*tint*(.72+.4*hgt);
	ALBEDO=col;NORMAL=normalize(vn);ROUGHNESS=.85;SPECULAR=.25;
	BACKLIGHT=col*.55;
}
