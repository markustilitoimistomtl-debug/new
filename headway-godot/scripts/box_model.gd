class_name BoxModel
## Helpers for simple box-built models (aircraft, characters) with outward normals.

static func box(st: SurfaceTool, a: Vector3, b: Vector3, col: Color):
	var c := [Vector3(a.x, a.y, a.z), Vector3(b.x, a.y, a.z), Vector3(b.x, b.y, a.z), Vector3(a.x, b.y, a.z),
		Vector3(a.x, a.y, b.z), Vector3(b.x, a.y, b.z), Vector3(b.x, b.y, b.z), Vector3(a.x, b.y, b.z)]
	var faces := [[[0, 1, 2, 3], Vector3(0, 0, -1)], [[5, 4, 7, 6], Vector3(0, 0, 1)], [[4, 0, 3, 7], Vector3(-1, 0, 0)],
		[[1, 5, 6, 2], Vector3(1, 0, 0)], [[3, 2, 6, 7], Vector3(0, 1, 0)], [[4, 5, 1, 0], Vector3(0, -1, 0)]]
	for f in faces:
		var q: Array = f[0]
		for k in [0, 1, 2, 0, 2, 3]:
			st.set_color(col); st.set_normal(f[1]); st.add_vertex(c[q[k]])

static func material() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.roughness = 0.6
	return m

static func mesh_of(parts: Array) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for p in parts:
		box(st, p[0], p[1], p[2])
	var m := st.commit()
	m.surface_set_material(0, material())
	return m
