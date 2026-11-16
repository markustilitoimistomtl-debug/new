class_name TerrainBuilder
## Builds the terrain and water meshes of a map.

static func build_terrain(m: MapData, mat: ShaderMaterial) -> MeshInstance3D:
	var n := m.n
	var cs := m.cs
	var ex := m.exag
	var hf := (n - 1) * 0.5
	var verts := PackedVector3Array(); verts.resize(n * n)
	var norms := PackedVector3Array(); norms.resize(n * n)
	var uvs := PackedVector2Array(); uvs.resize(n * n)
	for z in n:
		for x in n:
			var i := z * n + x
			verts[i] = Vector3((x - hf) * cs, m.h[i] * ex, (z - hf) * cs)
			uvs[i] = Vector2(x, z)
	for z in n:
		for x in n:
			var i := z * n + x
			var l := m.h[z * n + maxi(x - 1, 0)]
			var r := m.h[z * n + mini(x + 1, n - 1)]
			var d := m.h[maxi(z - 1, 0) * n + x]
			var u := m.h[mini(z + 1, n - 1) * n + x]
			norms[i] = Vector3((l - r) * ex, 2.0 * cs, (d - u) * ex).normalized()
	var idx := PackedInt32Array(); idx.resize((n - 1) * (n - 1) * 6)
	var k := 0
	for z in n - 1:
		for x in n - 1:
			var a := z * n + x
			idx[k] = a; idx[k + 1] = a + 1; idx[k + 2] = a + n
			idx[k + 3] = a + 1; idx[k + 4] = a + n + 1; idx[k + 5] = a + n
			k += 6
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = norms
	arr[Mesh.ARRAY_TEX_UV] = uvs
	arr[Mesh.ARRAY_INDEX] = idx
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	mesh.surface_set_material(0, mat)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	return mi

## Flat water surfaces over every cell group that has a water level.
static func build_water(m: MapData, mat: ShaderMaterial) -> MeshInstance3D:
	var n := m.n
	var cs := m.cs
	var ex := m.exag
	var hf := (n - 1) * 0.5
	var verts := PackedVector3Array()
	var cols := PackedColorArray()
	for z in n - 1:
		for x in n - 1:
			var lv := -INF
			for c in [z * n + x, z * n + x + 1, (z + 1) * n + x, (z + 1) * n + x + 1]:
				var w := m.wl[c]
				if not is_nan(w):
					lv = maxf(lv, w)
			if lv == -INF:
				continue
			var q := [Vector2i(x, z), Vector2i(x + 1, z), Vector2i(x + 1, z + 1), Vector2i(x, z + 1)]
			for j in [0, 1, 2, 0, 2, 3]:
				var p: Vector2i = q[j]
				verts.append(Vector3((p.x - hf) * cs, lv * ex, (p.y - hf) * cs))
				cols.append(Color(clampf((lv - m.h[p.y * n + p.x]) / 30.0, 0.0, 1.0), 0, 0))
	var mi := MeshInstance3D.new()
	if verts.is_empty():
		return mi
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_COLOR] = cols
	var norms := PackedVector3Array(); norms.resize(verts.size()); norms.fill(Vector3.UP)
	arr[Mesh.ARRAY_NORMAL] = norms
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	mesh.surface_set_material(0, mat)
	mi.mesh = mesh
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi
