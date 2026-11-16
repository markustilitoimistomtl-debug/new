class_name Forest
extends Node3D
## Trees for the local view: species built from textured foliage cards, placed per land cover.

const TILE := 384.0
const VIEW_RANGE := 620.0
const TREE_DENSITY := {0: 1.05, 10: 1.4, 13: 0.32, 16: 0.16, 14: 0.035, 15: 0.05, 1: 0.14, 3: 0.07, 7: 0.012, 2: 0.03, 18: 0.01}
# species: geometry, height range, birch bark flag
const SPECIES := [
	{"g": "spruce", "h": [14.0, 28.0]}, {"g": "spruce", "h": [9.0, 17.0]}, {"g": "pine", "h": [14.0, 25.0]},
	{"g": "larch", "h": [14.0, 24.0]}, {"g": "birch", "h": [10.0, 20.0], "birch": true}, {"g": "broad", "h": [9.0, 17.0]},
	{"g": "broad", "h": [4.0, 8.0]}, {"g": "rowan", "h": [5.0, 9.0]}, {"g": "shrub", "h": [0.9, 2.4]}, {"g": "broad", "h": [16.0, 30.0]}]
const WEIGHTS := {0: [44, 2, 18, 4, 14, 6, 1, 4, 7, 0], 10: [0, 0, 0, 0, 0, 25, 0, 3, 12, 60], 13: [24, 1, 30, 5, 18, 4, 2, 3, 13, 0],
	16: [6, 0, 4, 0, 32, 8, 28, 2, 20, 0], 14: [2, 1, 3, 1, 28, 18, 8, 14, 25, 0], 15: [12, 0, 6, 1, 34, 3, 2, 6, 36, 0],
	7: [2, 0, 2, 0, 30, 36, 10, 10, 10, 0], 18: [2, 0, 40, 0, 18, 0, 6, 0, 34, 0], 1: [6, 4, 4, 2, 22, 30, 6, 12, 14, 0], 3: [6, 4, 4, 2, 22, 30, 6, 12, 14, 0]}
const GEOMS := ["spruce", "pine", "larch", "birch", "broad", "rowan", "shrub"]
const VARIANTS := 2

var meshes := {}   # geom -> [ArrayMesh per variant]
var count := 0

static func _bark_color(g: String) -> Color:
	match g:
		"pine": return Color(0.42, 0.24, 0.14)
		"birch": return Color(0.85, 0.84, 0.8)
		_: return Color(0.26, 0.19, 0.13)

# ---------------- geometry ----------------
class Builder:
	var st := SurfaceTool.new()
	var nverts := 0
	func _init():
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
	func vert(p: Vector3, n: Vector3, uv: Vector2, c := Color.WHITE):
		st.set_color(c); st.set_normal(n); st.set_uv(uv); st.add_vertex(p); nverts += 1
	func card(a: Vector3, b: Vector3, c: Vector3, d: Vector3, centre: Vector3, up_bias := 0.35):
		# a-b along the base edge, quad a,b,c,d with uv (0,1),(1,1),(1,0),(0,0); normals point away from the crown centre
		var pts := [a, b, c, d]
		var uvs := [Vector2(0, 1), Vector2(1, 1), Vector2(1, 0), Vector2(0, 0)]
		var ns := []
		for p in pts:
			var v: Vector3 = (p - centre)
			v.y = v.y + up_bias * maxf(v.length(), 0.05)
			ns.append(v.normalized())
		for k in [0, 1, 2, 0, 2, 3]:
			vert(pts[k], ns[k], uvs[k])
	func trunk(r0: float, r1: float, h: float, sides: int, col: Color, lean := 0.0):
		for k in sides:
			var a0 := TAU * k / sides
			var a1 := TAU * (k + 1) / sides
			var p00 := Vector3(cos(a0) * r0, 0, sin(a0) * r0)
			var p10 := Vector3(cos(a1) * r0, 0, sin(a1) * r0)
			var p01 := Vector3(cos(a0) * r1 + lean * h, h, sin(a0) * r1)
			var p11 := Vector3(cos(a1) * r1 + lean * h, h, sin(a1) * r1)
			var n0 := Vector3(cos(a0), 0.2, sin(a0)).normalized()
			var n1 := Vector3(cos(a1), 0.2, sin(a1)).normalized()
			vert(p00, n0, Vector2.ZERO, col); vert(p10, n1, Vector2.ZERO, col); vert(p11, n1, Vector2.ZERO, col)
			vert(p00, n0, Vector2.ZERO, col); vert(p11, n1, Vector2.ZERO, col); vert(p01, n0, Vector2.ZERO, col)
	func commit() -> ArrayMesh:
		return st.commit()

func _branch_card(b: Builder, base: Vector3, dir: Vector3, length: float, width: float, roll: float, centre: Vector3):
	var side := dir.cross(Vector3.UP)
	if side.length() < 0.01:
		side = Vector3.RIGHT
	side = side.normalized().rotated(dir.normalized(), roll)
	var tip := base + dir * length
	var w := side * width * 0.5
	b.card(base - w, base + w, tip + w, tip - w, centre)

func _conifer(g: String, rng: RandomNumberGenerator) -> ArrayMesh:
	var trunk_b := Builder.new()
	var leaf := Builder.new()
	var larch := g == "larch"
	trunk_b.trunk(0.026 if not larch else 0.022, 0.004, 1.0, 6, _bark_color(g))
	var whorls := 17 if not larch else 15
	for k in whorls:
		var y := 0.07 + k * (0.9 / whorls)
		var t := (y - 0.07) / 0.93
		var radius := (0.27 if not larch else 0.22) * pow(1.0 - t, 0.95) + 0.025
		var nb := rng.randi_range(5, 7)
		var off := rng.randf() * TAU
		for j in nb:
			var a := off + TAU * j / nb + rng.randf_range(-0.25, 0.25)
			var droop := rng.randf_range(0.18, 0.38) if not larch else rng.randf_range(0.05, 0.2)
			var dir := Vector3(cos(a), -droop, sin(a)).normalized()
			var L := radius * rng.randf_range(0.85, 1.15) / maxf(0.6, Vector3(dir.x, 0, dir.z).length())
			var base := Vector3(0, y, 0)
			var centre := Vector3(0, y + 0.08, 0)
			var w := L * (0.9 if not larch else 0.8)
			_branch_card(leaf, base, dir, L, w, rng.randf_range(-0.35, 0.35), centre)
			if j % 2 == 0:
				_branch_card(leaf, base + Vector3(0, 0.01, 0), dir, L * 0.95, w * 0.85, PI * 0.5 + rng.randf_range(-0.3, 0.3), centre)
	# leader
	for j in 2:
		var a := j * PI * 0.5
		var s := Vector3(cos(a), 0, sin(a)) * 0.035
		leaf.card(Vector3(0, 0.9, 0) - s, Vector3(0, 0.9, 0) + s, Vector3(0, 1.04, 0) + s * 0.3, Vector3(0, 1.04, 0) - s * 0.3, Vector3(0, 0.8, 0))
	return _combine(trunk_b, leaf)

func _pine(rng: RandomNumberGenerator) -> ArrayMesh:
	var trunk_b := Builder.new()
	var leaf := Builder.new()
	trunk_b.trunk(0.032, 0.012, 0.92, 7, _bark_color("pine"), 0.02)
	var centre := Vector3(0.02, 0.84, 0)
	for k in 5:
		var y := 0.66 + k * 0.065
		var nb := rng.randi_range(3, 5)
		var off := rng.randf() * TAU
		for j in nb:
			var a := off + TAU * j / nb + rng.randf_range(-0.4, 0.4)
			var dir := Vector3(cos(a), rng.randf_range(-0.05, 0.25), sin(a)).normalized()
			var L := (0.26 - absf(k - 1.5) * 0.035) * rng.randf_range(0.85, 1.2)
			var base := Vector3(0.02 * y, y, 0)
			_branch_card(leaf, base, dir, L, L * 1.1, rng.randf_range(-0.4, 0.4), centre)
			_branch_card(leaf, base, dir, L * 0.9, L * 0.9, PI * 0.5 + rng.randf_range(-0.3, 0.3), centre)
			# tufts at the branch tip
			var tip := base + dir * L
			for q in 2:
				_branch_card(leaf, tip - dir * 0.06, (dir + Vector3(0, 0.7, 0)).normalized(), 0.15, 0.15, q * PI * 0.5, centre)
	return _combine(trunk_b, leaf)

func _broadleaf(g: String, rng: RandomNumberGenerator) -> ArrayMesh:
	var trunk_b := Builder.new()
	var leaf := Builder.new()
	var centre: Vector3
	var radii: Vector3
	var cards: int
	var size: float
	match g:
		"birch":
			trunk_b.trunk(0.02, 0.006, 0.92, 6, _bark_color("birch"), 0.03)
			centre = Vector3(0.02, 0.68, 0); radii = Vector3(0.16, 0.27, 0.16); cards = 38; size = 0.16
		"rowan":
			trunk_b.trunk(0.032, 0.014, 0.62, 6, _bark_color("rowan"), 0.02)
			centre = Vector3(0, 0.66, 0); radii = Vector3(0.25, 0.21, 0.25); cards = 34; size = 0.2
		"shrub":
			centre = Vector3(0, 0.34, 0); radii = Vector3(0.45, 0.3, 0.45); cards = 26; size = 0.36
		_:
			trunk_b.trunk(0.04, 0.018, 0.6, 7, _bark_color("broad"))
			centre = Vector3(0, 0.64, 0); radii = Vector3(0.31, 0.25, 0.31); cards = 44; size = 0.24
	# a few limbs
	if g != "shrub":
		for j in 4:
			var a := rng.randf() * TAU
			var limb_tip := centre + Vector3(cos(a) * radii.x * 0.7, rng.randf_range(-0.1, 0.15), sin(a) * radii.z * 0.7)
			var p0 := Vector3(0, centre.y - radii.y * 0.9, 0)
			var dirv := (limb_tip - p0)
			var side := dirv.cross(Vector3.UP).normalized() * 0.01
			trunk_b.vert(p0 - side, Vector3.UP, Vector2.ZERO, _bark_color(g)); trunk_b.vert(p0 + side, Vector3.UP, Vector2.ZERO, _bark_color(g)); trunk_b.vert(limb_tip, Vector3.UP, Vector2.ZERO, _bark_color(g))
	for i in cards:
		var u := rng.randf() * TAU
		var v := acos(2.0 * rng.randf() - 1.0)
		var r := 0.55 + 0.45 * pow(rng.randf(), 0.5)
		var out := Vector3(sin(v) * cos(u), cos(v), sin(v) * sin(u))
		var p := centre + Vector3(out.x * radii.x, out.y * radii.y, out.z * radii.z) * r
		var s := size * rng.randf_range(0.75, 1.25)
		# card facing outwards from the crown, slightly randomised
		var nrm := (out + Vector3(rng.randf_range(-0.5, 0.5), rng.randf_range(-0.2, 0.6), rng.randf_range(-0.5, 0.5))).normalized()
		var t1 := nrm.cross(Vector3.UP if absf(nrm.y) < 0.95 else Vector3.RIGHT).normalized().rotated(nrm, rng.randf() * TAU)
		var t2 := nrm.cross(t1).normalized()
		var h1 := t1 * s * 0.5
		var h2 := t2 * s * 0.5
		leaf.card(p - h1 - h2, p + h1 - h2, p + h1 + h2, p - h1 + h2, centre - Vector3(0, radii.y * 0.3, 0), 0.25)
	return _combine(trunk_b, leaf)

func _combine(trunk_b: Builder, leaf: Builder) -> ArrayMesh:
	if trunk_b.nverts == 0:
		return leaf.commit()
	var m := trunk_b.commit()
	leaf.st.commit(m)
	return m

# ---------------- placement ----------------
func pick(t: int, x: float, z: float, alt: float, rng: RandomNumberGenerator) -> Dictionary:
	var w: Array = (WEIGHTS[t] if WEIGHTS.has(t) else WEIGHTS[0]).duplicate()
	for i in w.size():
		w[i] = float(w[i]) * (0.3 + 1.4 * _patch(x / 130.0 + i * 3.7, z / 130.0 - i * 2.3))
	w[2] *= 0.6 + alt * 1.2
	w[0] *= 1.3 - alt * 0.6
	w[4] *= 1.2 - alt * 0.5
	var s := 0.0
	for v in w:
		s += v
	var u := rng.randf() * s
	var i := 0
	while i < w.size() - 1:
		u -= w[i]
		if u <= 0.0:
			break
		i += 1
	var sp: Dictionary = SPECIES[i]
	var h: float = rng.randf_range(sp.h[0], sp.h[1])
	if t == 15 and i != 8:
		h *= 0.35
	var v := rng.randf()
	var r2 := rng.randf()
	var tint: Color
	match i:
		0: tint = Color(0.86 + 0.1 * v, 0.9 + 0.1 * v, 0.88)
		1: tint = Color(0.82, 1.0, 1.25 + 0.1 * v)
		2: tint = Color(0.9 + 0.1 * v, 0.95 + 0.08 * v, 0.95)
		3: tint = Color(1.4, 1.05, 0.45) if r2 < 0.08 else Color(0.95 + 0.1 * v, 1.0, 0.9)
		4: tint = Color(1.35, 1.05, 0.5) if r2 < 0.04 else Color(0.9 + 0.12 * v, 0.95 + 0.1 * v, 0.9)
		5: tint = Color(0.9 + 0.12 * v, 0.95 + 0.1 * v, 0.9)
		6: tint = Color(1.25, 1.25, 1.3)
		7: tint = Color(0.95 + 0.1 * v, 1.0, 0.95)
		8: tint = Color(0.85 + 0.2 * v, 0.95 + 0.1 * v, 0.9)
		_: tint = Color(0.75, 1.1, 0.8)
	tint.a = 1.0 if sp.has("birch") else 0.0
	return {"g": sp.g, "h": h, "tint": tint}

func _patch(x: float, z: float) -> float:
	var ix := floorf(x)
	var iz := floorf(z)
	var fx := x - ix
	var fz := z - iz
	fx = fx * fx * (3.0 - 2.0 * fx)
	fz = fz * fz * (3.0 - 2.0 * fz)
	return lerpf(lerpf(_h2(ix, iz), _h2(ix + 1, iz), fx), lerpf(_h2(ix, iz + 1), _h2(ix + 1, iz + 1), fx), fz)

func _h2(x: float, z: float) -> float:
	var h := int(x) * 374761393 ^ int(z) * 668265263
	h = (h ^ (h >> 13)) * 1274126177
	return float((h ^ (h >> 16)) & 0x7fffffff) / 2147483647.0

func build(m: MapData, foliage_mat: Dictionary, bark_mat: ShaderMaterial, keep_clear: Callable):
	var rng := RandomNumberGenerator.new()
	for g in GEOMS:
		var list := []
		for v in VARIANTS:
			rng.seed = hash(g) + v * 7919
			var mesh: ArrayMesh
			match g:
				"spruce", "larch": mesh = _conifer(g, rng)
				"pine": mesh = _pine(rng)
				_: mesh = _broadleaf(g, rng)
			if mesh.get_surface_count() > 0:
				mesh.surface_set_material(0, bark_mat)
			mesh.surface_set_material(mesh.get_surface_count() - 1, foliage_mat[g])
			list.append(mesh)
		meshes[g] = list
	# placement into tiles
	rng.seed = 9173
	var tiles := {}
	var n := m.n
	var cs := m.cs
	var area := (cs / 10.0) * (cs / 10.0)
	var minh := INF
	var maxh := -INF
	for v in m.h:
		minh = minf(minh, v); maxh = maxf(maxh, v)
	var span := maxf(1.0, maxh - minh)
	for i in n * n:
		var t: int = m.land[i]
		if not TREE_DENSITY.has(t):
			continue
		var e: float = TREE_DENSITY[t] * area
		var k := int(e) + (1 if rng.randf() < fmod(e, 1.0) else 0)
		if k == 0:
			continue
		var cx := (i % n - (n - 1) * 0.5) * cs
		var cz := (i / n - (n - 1) * 0.5) * cs
		var alt := (m.h[i] - minh) / span
		for q in k:
			var x := cx + (rng.randf() - 0.5) * cs
			var z := cz + (rng.randf() - 0.5) * cs
			if not keep_clear.call(x, z):
				continue
			var w := m.wl[m.index_at(x, z)]
			if not is_nan(w) and m.height(x, z) < w + 0.3:
				continue
			var tp := pick(t, x, z, alt, rng)
			var key := Vector2i(floori(x / TILE), floori(z / TILE))
			var gk: String = tp.g + str(rng.randi() % VARIANTS)
			if not tiles.has(key):
				tiles[key] = {}
			if not tiles[key].has(gk):
				tiles[key][gk] = []
			var hh: float = tp.h
			var basis := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(hh * rng.randf_range(0.85, 1.15), hh, hh * rng.randf_range(0.85, 1.15)))
			tiles[key][gk].append([Transform3D(basis, Vector3(x, m.ground_y(x, z) - 0.25, z)), tp.tint])
			count += 1
	for key in tiles:
		for gk in tiles[key]:
			var items: Array = tiles[key][gk]
			var g: String = gk.substr(0, gk.length() - 1)
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_3D
			mm.use_custom_data = true
			mm.mesh = meshes[g][int(gk.right(1))]
			mm.instance_count = items.size()
			for j in items.size():
				mm.set_instance_transform(j, items[j][0])
				mm.set_instance_custom_data(j, items[j][1])
			var mi := MultiMeshInstance3D.new()
			mi.multimesh = mm
			mi.visibility_range_end = VIEW_RANGE
			mi.visibility_range_end_margin = 40.0
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			add_child(mi)
