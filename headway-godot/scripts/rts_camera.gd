class_name RtsCamera
extends Camera3D
## Age of Empires style camera: pan, rotate in steps, tilt and zoom over the terrain.

var map: MapData
var target := Vector3.ZERO
var yaw := PI / 4
var pitch := 0.98
var dist := 62.0
var goal := {"x": 0.0, "z": 0.0, "yaw": PI / 4, "pitch": 0.98, "dist": 62.0}
var follow: Node3D = null
var ty := 0.0

func _ready():
	fov = 36.0
	near = 0.3
	far = 4000.0

func jump_to(x: float, z: float):
	goal.x = x; goal.z = z
	target.x = x; target.z = z
	ty = map.top_y(x, z)

func pan(dx: float, dy: float):
	var vh := get_viewport().get_visible_rect().size.y
	var sc := 2.0 * dist * tan(deg_to_rad(fov) * 0.5) / vh
	var c := cos(goal.yaw)
	var s := sin(goal.yaw)
	var fy := dy / maxf(sin(goal.pitch), 0.3)
	goal.x += -dx * sc * c - fy * sc * s
	goal.z += dx * sc * s - fy * sc * c
	var h := map.half() - 5.0
	goal.x = clampf(goal.x, -h, h)
	goal.z = clampf(goal.z, -h, h)
	follow = null

func tick(dt: float):
	if follow != null:
		goal.x = follow.position.x
		goal.z = follow.position.z
	var k := 1.0 - exp(-dt * 9.0)
	target.x = lerpf(target.x, goal.x, k)
	target.z = lerpf(target.z, goal.z, k)
	yaw = lerp_angle(yaw, goal.yaw, k)
	pitch = lerpf(pitch, goal.pitch, k)
	dist = lerpf(dist, goal.dist, k)
	ty = lerpf(ty, map.top_y(target.x, target.z), minf(1.0, dt * 5.0))
	var dir := Vector3(cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw))
	var t := Vector3(target.x, ty, target.z)
	position = t + dir * dist
	look_at(t, Vector3.UP)

## Point on the terrain under a screen position, or null.
func pick(screen: Vector2):
	var o := project_ray_origin(screen)
	var d := project_ray_normal(screen)
	var prev := 0.0
	var t := 0.0
	while t < 3000.0:
		var p := o + d * t
		if p.y <= map.top_y(p.x, p.z):
			var lo := prev
			var hi := t
			for i in 12:
				var mid := (lo + hi) * 0.5
				var q := o + d * mid
				if q.y <= map.top_y(q.x, q.z):
					hi = mid
				else:
					lo = mid
			return o + d * hi
		prev = t
		t += 1.5
	return null
