class_name MapData
extends RefCounted
## A prepared Terrain Forge map: levelled heights, water levels, land cover, airstrip and camp.

var name := ""
var n := 0
var cs := 10.0
var exag := 1.6
var h := PackedFloat32Array()
var wl := PackedFloat32Array()
var land := PackedByteArray()
var runway := {}
var camp := Vector2.ZERO
var palette := []

static func load_map(dir: String) -> MapData:
	var m := MapData.new()
	var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(dir + "/map.json"))
	m.name = meta.name
	m.n = int(meta.n)
	m.cs = float(meta.cellSize)
	m.exag = float(meta.exaggeration)
	m.h = FileAccess.get_file_as_bytes(dir + "/heights.f32").to_float32_array()
	m.wl = FileAccess.get_file_as_bytes(dir + "/water.f32").to_float32_array()
	m.land = FileAccess.get_file_as_bytes(dir + "/land.u8")
	m.runway = meta.runway
	m.camp = Vector2(float(meta.camp.x), float(meta.camp.z))
	m.palette = meta.palette
	return m

func half() -> float:
	return (n - 1) * 0.5 * cs

func index_at(x: float, z: float) -> int:
	var cx := clampi(roundi(x / cs + (n - 1) * 0.5), 0, n - 1)
	var cz := clampi(roundi(z / cs + (n - 1) * 0.5), 0, n - 1)
	return cz * n + cx

## Ground height in metres (not exaggerated), bilinear.
func height(x: float, z: float) -> float:
	var fx := clampf(x / cs + (n - 1) * 0.5, 0.0, n - 1.001)
	var fz := clampf(z / cs + (n - 1) * 0.5, 0.0, n - 1.001)
	var x0 := int(fx)
	var z0 := int(fz)
	var tx := fx - x0
	var tz := fz - z0
	var i := z0 * n + x0
	return lerpf(lerpf(h[i], h[i + 1], tx), lerpf(h[i + n], h[i + n + 1], tx), tz)

func ground_y(x: float, z: float) -> float:
	return height(x, z) * exag

## Water surface (exaggerated) where the point is under water, otherwise NAN.
func water_y(x: float, z: float) -> float:
	var w := wl[index_at(x, z)]
	if is_nan(w) or height(x, z) >= w - 0.35:
		return NAN
	return w * exag

func top_y(x: float, z: float) -> float:
	var w := water_y(x, z)
	return ground_y(x, z) if is_nan(w) else maxf(ground_y(x, z), w)

func land_at(x: float, z: float) -> int:
	return land[index_at(x, z)]

func inside(x: float, z: float) -> bool:
	var hh := half()
	return absf(x) <= hh and absf(z) <= hh
