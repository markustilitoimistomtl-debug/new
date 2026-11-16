class_name Aircraft
extends Node3D
## The small high-wing aircraft parked at the camp airstrip.

const SCALE := 1.6
var prop: MeshInstance3D

func _ready():
	var W := Color(0.93, 0.93, 0.9); var R := Color(0.78, 0.13, 0.1); var G := Color(0.13, 0.17, 0.24); var T := Color(0.07, 0.07, 0.07); var S := Color(0.6, 0.6, 0.62)
	var parts := [
		[Vector3(-.6, .85, -1.3), Vector3(.6, 2.25, 3.0), W], [Vector3(-.38, 1.25, -4.9), Vector3(.38, 2.05, -1.3), W], [Vector3(-.52, .95, 3.0), Vector3(.52, 2.0, 3.95), W],
		[Vector3(-.62, 1.25, -4.6), Vector3(.62, 1.42, 3.0), R], [Vector3(-.63, 1.72, .5), Vector3(.63, 2.18, 2.6), G], [Vector3(-5.6, 2.25, .35), Vector3(5.6, 2.42, 1.95), W],
		[Vector3(-5.6, 2.24, .34), Vector3(-5.1, 2.43, 1.96), R], [Vector3(5.1, 2.24, .34), Vector3(5.6, 2.43, 1.96), R], [Vector3(-1.75, 1.0, .95), Vector3(-1.6, 2.3, 1.12), S],
		[Vector3(1.6, 1.0, .95), Vector3(1.75, 2.3, 1.12), S], [Vector3(-1.9, 1.62, -5.0), Vector3(1.9, 1.74, -4.05), W], [Vector3(-.07, 2.0, -5.0), Vector3(.07, 3.35, -3.9), R],
		[Vector3(-1.42, 0, .3), Vector3(-1.18, .58, .86), T], [Vector3(1.18, 0, .3), Vector3(1.42, .58, .86), T], [Vector3(-.12, 0, 3.2), Vector3(.12, .46, 3.62), T],
		[Vector3(-1.3, .4, .5), Vector3(-.5, .52, .7), S], [Vector3(.5, .4, .5), Vector3(1.3, .52, .7), S], [Vector3(-.13, 1.38, 3.95), Vector3(.13, 1.62, 4.3), S]]
	var body := MeshInstance3D.new()
	body.mesh = BoxModel.mesh_of(parts)
	body.scale = Vector3.ONE * SCALE
	add_child(body)
	prop = MeshInstance3D.new()
	prop.mesh = BoxModel.mesh_of([[Vector3(-1.05, -.06, 0), Vector3(1.05, .06, .06), Color(0.15, 0.15, 0.15)]])
	prop.position = Vector3(0, 1.5, 4.32) * SCALE
	prop.scale = Vector3.ONE * SCALE
	add_child(prop)
