class_name Character
extends Node3D
## A simple playable person: walks on land, swims in water, refuses cliffs.

const SCALE := 1.45
var display_name := ""
var map: MapData
var target = null
var heading := 0.0
var phase := 0.0
var move := 0.0
var swim := 0.0
var body: Node3D
var legs := []
var arms := []
var ring: MeshInstance3D

func setup(n: String, shirt: Color, hair: Color, skin: Color, m: MapData):
	display_name = n
	map = m
	body = Node3D.new()
	body.scale = Vector3.ONE * SCALE
	add_child(body)
	var torso := MeshInstance3D.new()
	torso.mesh = BoxModel.mesh_of([[Vector3(-.21, .9, -.12), Vector3(.21, 1.48, .12), shirt], [Vector3(-.17, .98, -.27), Vector3(.17, 1.42, -.12), Color(0.42, 0.3, 0.17)],
		[Vector3(-.11, 1.5, -.11), Vector3(.11, 1.76, .11), skin], [Vector3(-.12, 1.71, -.12), Vector3(.12, 1.81, .07), hair]])
	body.add_child(torso)
	for s in [-1, 1]:
		var leg := Node3D.new()
		leg.position = Vector3(s * .105, .92, 0)
		var lm := MeshInstance3D.new()
		lm.mesh = BoxModel.mesh_of([[Vector3(-.075, -.92, -.08), Vector3(.075, 0, .08), Color(0.2, 0.24, 0.33)]])
		leg.add_child(lm)
		body.add_child(leg)
		legs.append(leg)
		var arm := Node3D.new()
		arm.position = Vector3(s * .27, 1.42, 0)
		var am := MeshInstance3D.new()
		am.mesh = BoxModel.mesh_of([[Vector3(-.05, -.54, -.06), Vector3(.05, 0, .06), shirt]])
		arm.add_child(am)
		body.add_child(arm)
		arms.append(arm)
	ring = MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.9
	tm.outer_radius = 1.15
	ring.mesh = tm
	var rm := StandardMaterial3D.new()
	rm.albedo_color = Color(0.55, 0.85, 1.0)
	rm.emission_enabled = true
	rm.emission = Color(0.35, 0.65, 1.0)
	rm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring.material_override = rm
	ring.position.y = 0.08
	ring.visible = false
	add_child(ring)

func set_active(a: bool):
	ring.visible = a

func _can_step(from: Vector3, to: Vector3) -> bool:
	if not map.inside(to.x, to.z):
		return false
	if not is_nan(map.water_y(to.x, to.z)):
		return true
	var d := Vector2(to.x - from.x, to.z - from.z).length()
	return (map.height(to.x, to.z) - map.height(from.x, from.z)) / maxf(d, 0.001) < 1.25

func tick(dt: float):
	var moved := false
	var in_water := not is_nan(map.water_y(position.x, position.z))
	if target != null:
		var to: Vector3 = target
		var d := Vector2(to.x - position.x, to.z - position.z)
		if d.length() < 0.3:
			target = null
		else:
			var step := minf(d.length(), (1.6 if in_water else 3.6) * dt)
			var dir := d.normalized()
			var nxt := position + Vector3(dir.x, 0, dir.y) * step
			if not _can_step(position, nxt):
				target = null
			else:
				var want := atan2(dir.x, dir.y)
				heading = lerp_angle(heading, want, minf(1.0, dt * 10.0))
				phase += step * (1.9 if in_water else 3.1)
				position.x = nxt.x
				position.z = nxt.z
				moved = true
	move = lerpf(move, 1.0 if moved else 0.0, minf(1.0, dt * 8.0))
	swim = lerpf(swim, 1.0 if in_water else 0.0, minf(1.0, dt * 5.0))
	if in_water and not moved:
		phase += dt * 1.2
	var gy := map.ground_y(position.x, position.z)
	var wy := map.water_y(position.x, position.z)
	var ty := gy if is_nan(wy) else maxf(gy, wy - 1.05 * SCALE + 0.12)
	position.y = lerpf(position.y, ty, minf(1.0, dt * 10.0))
	rotation.y = heading
	var s := sin(phase)
	var leg_a := lerpf(s * 0.6 * move, sin(phase * 2.3) * 0.35, swim)
	var arm_a := lerpf(-s * 0.5 * move, -phase, swim)
	legs[0].rotation.x = leg_a; legs[1].rotation.x = -leg_a
	arms[0].rotation.x = arm_a; arms[1].rotation.x = lerpf(-arm_a, -phase + PI, swim)
	body.rotation.x = 1.35 * swim
	body.position.y = absf(s) * 0.06 * move * (1.0 - swim)
