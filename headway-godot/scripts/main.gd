extends Node3D
## Headway (Godot) – first step: the base camp in the local (AoE-style) view.

const MAP_DIR := "res://maps/north_coast_42"
const SUN_AZ := 215.0
const SUN_EL := 34.0

var map: MapData
var cam: RtsCamera
var party: Array[Character] = []
var active := 0
var hud: Label
var drag_from = null
var drag_button := 0
var dragged := false
var shot := ""
var shot_frames := 0

func _ready():
	var args := {}
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else ""
	hud = Label.new()
	hud.position = Vector2(16, 12)
	hud.add_theme_font_size_override("font_size", 18)
	hud.add_theme_color_override("font_outline_color", Color.BLACK)
	hud.add_theme_constant_override("outline_size", 6)
	hud.text = "Building the camp…"
	var ui := CanvasLayer.new()
	ui.add_child(hud)
	add_child(ui)
	await get_tree().process_frame
	await get_tree().process_frame
	_build()
	if args.has("cam"):
		var c: PackedStringArray = args.cam.split(",")
		cam.follow = null
		cam.goal.x = float(c[0]); cam.goal.z = float(c[1]); cam.goal.dist = float(c[2]); cam.goal.pitch = float(c[3]); cam.goal.yaw = float(c[4])
		cam.jump_to(cam.goal.x, cam.goal.z)
		cam.dist = cam.goal.dist; cam.pitch = cam.goal.pitch; cam.yaw = cam.goal.yaw
	if args.has("shot"):
		shot = args.shot
		shot_frames = int(args.get("frames", "40"))

func _build():
	var t0 := Time.get_ticks_msec()
	map = MapData.load_map(MAP_DIR)
	_environment()
	# terrain
	var tmat := ShaderMaterial.new()
	tmat.shader = load("res://shaders/terrain.gdshader")
	var img := Image.create_from_data(map.n, map.n, false, Image.FORMAT_R8, map.land)
	tmat.set_shader_parameter("land_tex", ImageTexture.create_from_image(img))
	var pal := PackedVector3Array()
	for e in map.palette:
		pal.append(Vector3(pow(e[0] / 255.0, 2.2), pow(e[1] / 255.0, 2.2), pow(e[2] / 255.0, 2.2)))
	tmat.set_shader_parameter("pal", pal)
	tmat.set_shader_parameter("n_cells", float(map.n))
	tmat.set_shader_parameter("cell_size", map.cs)
	tmat.set_shader_parameter("exag", map.exag)
	var r := map.runway
	tmat.set_shader_parameter("rw0", Vector4(r.cx, r.cz, r.dx, r.dz))
	tmat.set_shader_parameter("rw1", Vector4(r.halfLength, r.halfWidth, 0, 0))
	tmat.set_shader_parameter("rw2", Vector4(r.apronAlong, r.apronAcross, 0, 0))
	add_child(TerrainBuilder.build_terrain(map, tmat))
	var wmat := ShaderMaterial.new()
	wmat.shader = load("res://shaders/water.gdshader")
	add_child(TerrainBuilder.build_water(map, wmat))
	# trees
	var fol := {}
	for g in Forest.GEOMS:
		var fm := ShaderMaterial.new()
		fm.shader = load("res://shaders/foliage.gdshader")
		fm.set_shader_parameter("leaf_tex", load("res://textures/%s.png" % g))
		fol[g] = fm
	var bark := ShaderMaterial.new()
	bark.shader = load("res://shaders/bark.gdshader")
	var forest := Forest.new()
	forest.build(map, fol, bark, _keep_clear)
	add_child(forest)
	# aircraft
	var plane := Aircraft.new()
	plane.position = Vector3(r.apronX, map.ground_y(r.apronX, r.apronZ), r.apronZ)
	plane.rotation.y = atan2(r.dx, r.dz)
	add_child(plane)
	# party
	var people := [["Leilani", Color(.85, .42, .18), Color(.32, .2, .1), Color(.88, .7, .56), Vector2(0, 0)],
		["Mateo", Color(.2, .45, .8), Color(.13, .11, .1), Color(.8, .62, .5), Vector2(2.6, 1.4)],
		["Nia", Color(.3, .62, .3), Color(.86, .74, .44), Color(.92, .76, .64), Vector2(-1.8, 2.4)]]
	for p in people:
		var c := Character.new()
		c.setup(p[0], p[1], p[2], p[3], map)
		var off: Vector2 = p[4]
		var x: float = map.camp.x + r.dx * off.x - r.dz * off.y
		var z: float = map.camp.y + r.dz * off.x + r.dx * off.y
		c.position = Vector3(x, map.ground_y(x, z), z)
		c.heading = atan2(r.dx, r.dz)
		add_child(c)
		party.append(c)
	# camera
	cam = RtsCamera.new()
	cam.map = map
	add_child(cam)
	cam.make_current()
	cam.jump_to(party[0].position.x, party[0].position.z)
	cam.follow = party[0]
	_set_active(0)
	print("Built in %d ms, %d trees" % [Time.get_ticks_msec() - t0, forest.count])

func _environment():
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var psm := ProceduralSkyMaterial.new()
	psm.sky_top_color = Color(0.32, 0.5, 0.75)
	psm.sky_horizon_color = Color(0.72, 0.8, 0.86)
	psm.ground_horizon_color = Color(0.72, 0.8, 0.86)
	psm.ground_bottom_color = Color(0.3, 0.33, 0.3)
	sky.sky_material = psm
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 1.1
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.1
	env.fog_enabled = true
	env.fog_light_color = Color(0.7, 0.78, 0.85)
	env.fog_density = 0.00045
	env.fog_aerial_perspective = 0.4
	env.ssao_enabled = true
	env.ssao_radius = 1.5
	env.ssao_intensity = 1.6
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	var az := deg_to_rad(SUN_AZ)
	var el := deg_to_rad(SUN_EL)
	var to_sun := Vector3(sin(az) * cos(el), sin(el), -cos(az) * cos(el))
	add_child(sun)
	sun.look_at(-to_sun, Vector3.UP)
	sun.light_color = Color(1.0, 0.95, 0.86)
	sun.light_energy = 1.7
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_max_distance = 320.0
	sun.shadow_blur = 1.5

func _keep_clear(x: float, z: float) -> bool:
	var r := map.runway
	var qx: float = x - r.cx
	var qz: float = z - r.cz
	var al: float = qx * r.dx + qz * r.dz
	var ac: float = -qx * r.dz + qz * r.dx
	if absf(al) < r.halfLength + 34.0 and absf(ac) < r.halfWidth + 30.0:
		return false
	if absf(al - r.apronAlong) < 32.0 and absf(ac - r.apronAcross) < 28.0:
		return false
	return Vector2(x - map.camp.x, z - map.camp.y).length() > 14.0

func _set_active(i: int):
	active = i
	for k in party.size():
		party[k].set_active(k == i)
	cam.follow = party[i]
	_update_hud()

func _update_hud():
	hud.text = "Headway · %s   —   click the ground to walk · Tab next character · WASD / edges move · Q/E rotate · wheel zoom · Space follow" % party[active].display_name

func _unhandled_input(e: InputEvent):
	if cam == null:
		return
	if e is InputEventMouseButton:
		if e.button_index == MOUSE_BUTTON_WHEEL_UP and e.pressed:
			cam.goal.dist = clampf(cam.goal.dist * 0.9, 18.0, 260.0)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN and e.pressed:
			cam.goal.dist = clampf(cam.goal.dist * 1.11, 18.0, 260.0)
		elif e.pressed:
			drag_from = e.position; drag_button = e.button_index; dragged = false
		else:
			if not dragged and drag_button == MOUSE_BUTTON_LEFT:
				var p = cam.pick(e.position)
				if p != null:
					party[active].target = p
					cam.follow = party[active]
			drag_from = null
	elif e is InputEventMouseMotion and drag_from != null:
		if (e.position - drag_from).length() > 5.0:
			dragged = true
		if dragged:
			if drag_button == MOUSE_BUTTON_LEFT:
				cam.pan(e.relative.x, e.relative.y)
			else:
				cam.goal.yaw -= e.relative.x * 0.006
				cam.goal.pitch = clampf(cam.goal.pitch + e.relative.y * 0.003, 0.5, 1.4)
	elif e is InputEventKey and e.pressed and not e.echo:
		match e.keycode:
			KEY_TAB:
				_set_active((active + 1) % party.size())
				get_viewport().set_input_as_handled()
			KEY_Q: cam.goal.yaw -= PI / 4
			KEY_E: cam.goal.yaw += PI / 4
			KEY_SPACE: cam.follow = party[active]
			KEY_ESCAPE: get_tree().quit()

func _process(dt: float):
	if cam == null:
		return
	var sp := 700.0 * dt
	var mv := Vector2.ZERO
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP): mv.y += sp
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN): mv.y -= sp
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT): mv.x += sp
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): mv.x -= sp
	var mp := get_viewport().get_mouse_position()
	var vs := get_viewport().get_visible_rect().size
	if DisplayServer.window_is_focused() and drag_from == null and shot == "":
		if mp.x >= 0 and mp.y >= 0 and mp.x < vs.x and mp.y < vs.y:
			if mp.x < 6: mv.x += sp
			if mp.x > vs.x - 6: mv.x -= sp
			if mp.y < 6: mv.y += sp
			if mp.y > vs.y - 6: mv.y -= sp
	if mv != Vector2.ZERO:
		cam.pan(mv.x, mv.y)
	for c in party:
		c.tick(dt)
	cam.tick(dt)
	if shot != "":
		shot_frames -= 1
		if shot_frames <= 0:
			var im := get_viewport().get_texture().get_image()
			im.save_png(shot)
			print("Saved ", shot)
			get_tree().quit()
