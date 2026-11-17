"""
MOVES RENDER 2  -  Blender -> 8-suuntaiset sprite-animaatiot (Vintage Basket / Moves)

Ajo (Windows, Blender 4.2+ / 5.x):
  blender -b -P moves_render.py -- [asetukset]

Tilat
  1) Testinukke (oletus): koripalloilija, 26 pelin liikettä, 7 hiustyyliä.
       blender -b -P moves_render.py -- --out renders
     Tulos on kerroksina, jotta pelissä voi vaihtaa ihon-, hius- ja joukkuevärit:
       body/<liike>_<SUUNTA>/...png        vartalo ilman hiuksia (avainvärit)
       hair_<tyyli>/<liike>_<SUUNTA>/...png pelkät hiukset (peitto käsien takana oikein)
     --palette natural tekee valmiiksi väritetyt kuvat avainvärien sijaan.
  2) Oma hahmo Mixamosta (FBX):
       blender -b -P moves_render.py -- --fbx-model hahmo.fbx --fbx-anim walk=Walking.fbx jog=Jogging.fbx --out renders

Asetukset
  --moves walk jog ...     mitka liikkeet (oletus: kaikki)
  --hair all | none | messy spiky crew long ponytail curly shaved
  --frames 48              walk/jog/run/backpedal/dribble_run ruutumaara
  --frames-other 24        muiden liikkeiden perusruutumaara (heitot/donkit 1.25x)
  --size 256               kuvan koko
  --elev 35                kameran kulma
  --palette key | natural  key = savytettavat avainvarit pelia varten
Suunnat: S = kameraan pain, N = poispain, E = oikealle, W = vasemmalle.

AVAINVARIT (palette key) - savyn (hue) mukaan, vari = kohdevari * kirkkaus/viitekirkkaus
  pallo 5-32 (ei muuteta) | iho 36-70 | kengan raita 90-150 | paidan reunus/numero 170-215
  hiukset 225-260 | paita+shortsit 280-330 | harmaat/valkoiset/mustat: ei muuteta
"""
import bpy, math, sys, os, json, argparse
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--out", default="renders")
ap.add_argument("--moves", nargs="*", default=None)
ap.add_argument("--hair", nargs="*", default=["all"])
ap.add_argument("--frames", type=int, default=48)
ap.add_argument("--frames-other", type=int, default=24)
ap.add_argument("--size", type=int, default=256)
ap.add_argument("--elev", type=float, default=35.0)
ap.add_argument("--palette", default="key", choices=["key", "natural"])
ap.add_argument("--fbx-model", default=None)
ap.add_argument("--fbx-anim", nargs="*", default=[])
ap.add_argument("--fbx-forward", default="-Y")
ap.add_argument("--export-test-fbx", default=None, help=argparse.SUPPRESS)
ap.add_argument("--rest", action="store_true", help="mittausasento: lepoasento kadet suorina (measure.py), ei pelin liike")
ap.add_argument("--sleeves", default="none", choices=["none", "long"], help="long = pitkahihainen lammittelypaita (hihat paidan avainvarissa)")
A = ap.parse_args(argv)
OUT = os.path.abspath(A.out); os.makedirs(OUT, exist_ok=True)

DIRS = [("S", 0), ("SE", 45), ("E", 90), ("NE", 135), ("N", 180), ("NW", 225), ("W", 270), ("SW", 315)]
HAIRS = ["messy", "spiky", "crew", "long", "ponytail", "curly", "shaved"]
if A.hair == ["all"]: HAIR_SEL = HAIRS
elif A.hair == ["none"]: HAIR_SEL = []
else: HAIR_SEL = [h for h in A.hair if h in HAIRS]

PALETTES = {
    "key": dict(jersey="#c42bc4", trim="#2bb3d6", skin="#d8b25a", hair="#4b4bd2", shoe="#f1efe9", shoe2="#33c24a",
                dark="#1b1b1f", sock="#f1efe9", eye="#1b1b1f"),
    "natural": dict(jersey="#c4282b", trim="#f4f1ea", skin="#c48a5e", hair="#3b2616", shoe="#f1efe9", shoe2="#c4282b",
                    dark="#1b1b1f", sock="#f1efe9", eye="#1b1b1f"),
}
PAL = PALETTES[A.palette]
SP = 2.65  # metres per sprite cell

def hexcol(h, a=1.0):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (a,)
def srgb2lin(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c[:3]) + (c[3],)

# ----------------------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
SC.render.engine = "BLENDER_WORKBENCH"
SC.render.film_transparent = True
SC.display.render_aa = "8"
SC.view_settings.view_transform = "Standard"
SC.render.image_settings.file_format = "PNG"; SC.render.image_settings.color_mode = "RGBA"
SC.render.image_settings.compression = 30
SH = SC.display.shading
SH.color_type = "MATERIAL"; SH.show_object_outline = True; SH.object_outline_color = (0.06, 0.035, 0.02)
SH.show_cavity = True; SH.cavity_type = "WORLD"; SH.cavity_ridge_factor = 0.0; SH.cavity_valley_factor = 1.2

def toon_matcap():
    S = 256; px = []; L = Vector((-0.45, 0.55, 0.70)).normalized()
    for j in range(S):
        for i in range(S):
            nx = (i - S / 2 + 0.5) / (S / 2); ny = (j - S / 2 + 0.5) / (S / 2); r2 = nx * nx + ny * ny
            if r2 > 1: px += [0, 0, 0, 0]; continue
            d = nx * L.x + ny * L.y + math.sqrt(1 - r2) * L.z
            v = 1.0 if d > 0.15 else 0.6
            if d > 0.9: v = 1.1
            v = min(1.0, v * 0.92); px += [v, v, v, 1]
    img = bpy.data.images.new("toon_matcap", S, S, alpha=True); img.pixels = px
    path = os.path.join(OUT, "_toon_matcap.png"); img.filepath_raw = path; img.file_format = "PNG"; img.save()
    return bpy.context.preferences.studio_lights.load(path, "MATCAP")
SH.light = "MATCAP"; SH.studio_light = toon_matcap().name

cam_d = bpy.data.cameras.new("cam"); cam_d.type = "ORTHO"
CAM = bpy.data.objects.new("cam", cam_d); SC.collection.objects.link(CAM); SC.camera = CAM
EL = math.radians(A.elev)
def set_camera(ncells):
    SC.render.resolution_x = A.size * ncells; SC.render.resolution_y = A.size
    cam_d.ortho_scale = SP * ncells
    target = Vector((0, 0, 1.02))
    CAM.location = target + Vector((0, -math.cos(EL) * 20, math.sin(EL) * 20)); CAM.rotation_euler = (math.pi / 2 - EL, 0, 0)

def mat(col):
    name = "m_" + col
    m = bpy.data.materials.get(name)
    if not m: m = bpy.data.materials.new(name); m.diffuse_color = srgb2lin(hexcol(col))
    return m

# ----------------------------------------------------------------------------- mannequin
# MITAT (vaihe 2A, measure.py): NBA-pelaaja, ei sarjakuvahahmo. Muuta naita ja aja measure.py uudelleen.
HEAD_S = (0.76, 0.85, 1.00)     # paan (ja hiusten) skaalaus leveys, syvyys, korkeus paan keskipisteesta
HEAD_TOP = 1.76                 # paalaki (pienempi paa: lyhyempi kaula, pituus 1,76 m)
ARM_X = (0.146, 0.161, 0.166)   # olkapaa, kyynarpaa, ranne (keskelta sivulle, m)
LEG_X = 0.075                   # jalkojen etaisyys keskelta
UPPER_R, FORE_R, DELT_R = 0.034, 0.028, 0.040      # olkavarsi, kyynarvarsi, olkapaan pallo
THIGH_R, SHORTS_R, SHIN_R, KNEE_R = 0.050, 0.066, 0.040, 0.045
BONES = {"hips": ((0, 0, 0.92), (0, 0, 1.08), None), "spine": ((0, 0, 1.08), (0, 0, 1.42), "hips"),
         "neck": ((0, 0, 1.42), (0, 0, 1.55), "spine"), "head": ((0, 0, 1.55), (0, 0, 1.80), "neck")}
for s, x in (("L", 1), ("R", -1)):
    a0, a1, a2 = ARM_X; lx = LEG_X
    BONES.update({
        f"thigh.{s}": ((lx * x, 0, 0.95), (lx * x, 0, 0.53), "hips"),
        f"shin.{s}": ((lx * x, 0, 0.53), (lx * x, 0, 0.10), f"thigh.{s}"),
        f"foot.{s}": ((lx * x, 0, 0.10), (lx * x, -0.17, 0.035), f"shin.{s}"),
        f"upperarm.{s}": ((a0 * x, 0, 1.40), (a1 * x, 0, 1.11), "spine"),
        f"forearm.{s}": ((a1 * x, 0, 1.11), (a2 * x, 0, 0.85), f"upperarm.{s}"),
        f"hand.{s}": ((a2 * x, 0, 0.85), (a2 * x, 0, 0.745), f"forearm.{s}")})

def _attach(o, rig, bone, loc):
    bh = rig.data.bones[bone]
    o.parent = rig; o.parent_type = "BONE"; o.parent_bone = bone
    world = bh.matrix_local @ Matrix.Translation((0, bh.length, 0))   # rig at origin, rest pose
    o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = world.inverted() @ Matrix.Translation(loc)

def part(rig, prim, bone, loc, scale, col, rot=(0, 0, 0), smooth=True, seg=16, edit=None):
    if prim == "cyl": bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=1, depth=1)
    elif prim == "sph": bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(8, seg // 2), radius=1)
    elif prim == "cube": bpy.ops.mesh.primitive_cube_add(size=1)
    elif prim == "ico": bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
    elif prim == "ico1": bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1)
    elif prim == "cone": bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=1, radius2=0.15, depth=1)
    o = bpy.context.object; o.scale = scale; o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if edit: edit(o, Vector(loc))
    if bone == "head" and HEAD_S != (1, 1, 1):   # smaller head, the hair and face scaled with it
        for v in o.data.vertices: v.co = Vector((v.co.x * HEAD_S[0], v.co.y * HEAD_S[1], v.co.z * HEAD_S[2]))
        c0 = Vector(HC); c1 = Vector((HC[0], HC[1], HEAD_TOP - (1.79 - HC[2]) * HEAD_S[2]))   # old top 1.79
        d = Vector(loc) - c0; loc = c1 + Vector((d.x * HEAD_S[0], d.y * HEAD_S[1], d.z * HEAD_S[2]))
    if smooth: bpy.ops.object.shade_smooth()
    else: bpy.ops.object.shade_flat()
    o.data.materials.append(mat(col)); _attach(o, rig, bone, Vector(loc))
    return o

def build_mannequin(root):
    arm_d = bpy.data.armatures.new("rig"); rig = bpy.data.objects.new("rig", arm_d)
    SC.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="EDIT")
    for n, (h, t, p) in BONES.items():
        b = arm_d.edit_bones.new(n); b.head = h; b.tail = t; b.roll = 0
        if p: b.parent = arm_d.edit_bones[p]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in rig.pose.bones: pb.rotation_mode = "YXZ"
    P = PAL; V = Vector
    J, T, SK, D = P["jersey"], P["trim"], P["skin"], P["dark"]
    part(rig, "cyl", "spine", V((0, 0, 1.25)), (0.115, 0.11, 0.36), J)
    part(rig, "cyl", "spine", V((0, 0, 1.40)), (0.15, 0.11, 0.06), J)
    part(rig, "cyl", "spine", V((0, -0.115, 1.24)), (0.07, 0.01, 0.10), T)
    part(rig, "cyl", "spine", V((0, 0.115, 1.25)), (0.09, 0.01, 0.12), T)
    part(rig, "cyl", "spine", V((0, 0, 1.43)), (0.09, 0.09, 0.012), T)          # collar trim
    part(rig, "cyl", "hips", V((0, 0, 1.02)), (0.13, 0.11, 0.14), J)
    part(rig, "cyl", "hips", V((0, 0, 0.91)), (0.135, 0.115, 0.05), T)          # waistband
    part(rig, "cyl", "neck", V((0, 0, 1.49)), (0.045, 0.045, 0.12), SK)
    part(rig, "sph", "head", V((0, -0.01, 1.66)), (0.105, 0.115, 0.13), SK)
    part(rig, "sph", "head", V((0.105, 0.0, 1.655)), (0.02, 0.03, 0.035), SK)  # ears
    part(rig, "sph", "head", V((-0.105, 0.0, 1.655)), (0.02, 0.03, 0.035), SK)
    part(rig, "cube", "head", V((0.042, -0.112, 1.668)), (0.032, 0.012, 0.018), P["eye"], smooth=False)
    part(rig, "cube", "head", V((-0.042, -0.112, 1.668)), (0.032, 0.012, 0.018), P["eye"], smooth=False)
    part(rig, "cube", "head", V((0, -0.118, 1.695)), (0.11, 0.008, 0.008), P["eye"], smooth=False)  # brows
    for s, x in (("L", 1), ("R", -1)):
        lx = LEG_X * x; a0, a1, a2 = (q * x for q in ARM_X)
        part(rig, "cyl", f"thigh.{s}", V((lx, 0, 0.80)), (SHORTS_R, SHORTS_R, 0.30), J)
        part(rig, "cyl", f"thigh.{s}", V((lx, 0, 0.655)), (SHORTS_R + 0.002, SHORTS_R + 0.002, 0.03), T)
        part(rig, "cyl", f"thigh.{s}", V((lx, 0, 0.58)), (THIGH_R, THIGH_R, 0.16), SK)
        part(rig, "sph", f"shin.{s}", V((lx, 0, 0.53)), (KNEE_R, KNEE_R, KNEE_R), SK)
        part(rig, "cyl", f"shin.{s}", V((lx, 0.005, 0.36)), (SHIN_R, SHIN_R * 1.05, 0.30), SK)
        part(rig, "cyl", f"shin.{s}", V((lx, 0, 0.18)), (SHIN_R * 0.95, SHIN_R * 0.95, 0.14), P["sock"])
        part(rig, "cube", f"foot.{s}", V((lx, -0.045, 0.065)), (0.08, 0.25, 0.10), P["shoe"], smooth=False)
        part(rig, "cube", f"foot.{s}", V((lx, -0.045, 0.012)), (0.085, 0.255, 0.025), P["shoe2"], smooth=False)
        if A.sleeves == "long":   # long-sleeved warm-up shirt: the arms down to the wrist in the shirt key colour
            sl = 0.004
            part(rig, "sph", f"upperarm.{s}", V((a0, 0, 1.37)), (DELT_R + sl, DELT_R + sl, (DELT_R + sl) * 1.1), J)
            part(rig, "cyl", f"upperarm.{s}", V(((a0 + a1) / 2, 0, 1.255)), (UPPER_R + sl, UPPER_R + sl, 0.27), J)
            part(rig, "sph", f"forearm.{s}", V((a1, 0, 1.11)), (UPPER_R + sl, UPPER_R + sl, UPPER_R + sl), J)   # elbow
            part(rig, "cyl", f"forearm.{s}", V(((a1 + a2) / 2, 0, 0.98)), (FORE_R + sl, FORE_R + sl, 0.25), J)
            part(rig, "cyl", f"forearm.{s}", V((a2, 0, 0.865)), (FORE_R + sl + 0.003, FORE_R + sl + 0.003, 0.03), J)   # cuff
        else:
            part(rig, "sph", f"upperarm.{s}", V((a0, 0, 1.37)), (DELT_R, DELT_R, DELT_R * 1.1), SK)
            part(rig, "cyl", f"upperarm.{s}", V(((a0 + a1) / 2, 0, 1.255)), (UPPER_R, UPPER_R, 0.27), SK)
            part(rig, "cyl", f"forearm.{s}", V(((a1 + a2) / 2, 0, 0.98)), (FORE_R, FORE_R, 0.25), SK)
            part(rig, "cyl", f"forearm.{s}", V((a2, 0, 0.88)), (FORE_R + 0.005, FORE_R + 0.005, 0.05), D)
        part(rig, "sph", f"hand.{s}", V((a2, 0, 0.79)), (0.032, 0.024, 0.055), SK)
    rig.parent = root
    return rig

# --- hair styles (all in the hair key colour, parented to the head bone)
HC = (0, -0.01, 1.66)
def _cut(o, keep):
    """delete vertices of a just-created mesh (object at origin, world coords) where keep(v) is False"""
    import bmesh
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context="VERTS")
    bm.to_mesh(o.data); bm.free()

def _spikes(amount, seed=1, zmin=-0.04):
    def f(o, loc):
        for i, v in enumerate(o.data.vertices):
            if v.co.z > zmin * 1:
                k = ((i * 7919 + seed * 104729) % 97) / 97.0
                v.co *= 1.0 + amount * k
    return f

def _hairline(front_z=1.70, back_z=1.58, side_z=1.64):
    def keep(c):
        y = c.y - HC[1]; z = c.z
        lim = side_z + (front_z - side_z) * max(0, -y / 0.12) - (side_z - back_z) * max(0, y / 0.12)
        return z >= lim
    return keep

def add_hair(rig, style):
    H = PAL["hair"]; V = Vector
    def cap(scale=(0.113, 0.123, 0.137), fz=1.70, bz=1.58, sz=1.645, z_off=0.004, flat=False, spikes=0.0, seed=1):
        def ed(o, loc):
            for v in o.data.vertices: v.co += V((0, 0, 0))
            o.location = (0, 0, 0)
            # move to head centre temporarily for the cut test
            for v in o.data.vertices: v.co += V(HC) + V((0, 0, z_off))
            _cut(o, _hairline(fz, bz, sz))
            for v in o.data.vertices: v.co -= V(HC) + V((0, 0, z_off))
            if spikes: _spikes(spikes, seed)(o, loc)
        return part(rig, "sph", "head", V(HC) + V((0, 0, z_off)), scale, H, smooth=not flat, seg=24, edit=ed)
    def cut_edit(fz=1.70, bz=1.585, sz=1.645, spikes=0.0, seed=1, zmin=-0.04):
        def ed(o, loc):
            if spikes: _spikes(spikes, seed, zmin)(o, loc)
            for v in o.data.vertices: v.co += loc
            _cut(o, _hairline(fz, bz, sz))
            for v in o.data.vertices: v.co -= loc
        return ed
    if style == "shaved":
        cap((0.108, 0.118, 0.133), fz=1.715, bz=1.60, sz=1.665)
    elif style == "crew":
        cap((0.114, 0.124, 0.139), fz=1.712, bz=1.60, sz=1.66)
        part(rig, "sph", "head", V((0, -0.01, 1.73)), (0.105, 0.118, 0.07), H, seg=16, edit=cut_edit(1.725, 1.60, 1.68))
    elif style == "messy":
        cap((0.118, 0.128, 0.14), fz=1.705, bz=1.585, sz=1.645)
        part(rig, "ico", "head", V((0, 0.005, 1.735)), (0.13, 0.14, 0.10), H, smooth=False, edit=cut_edit(1.72, 1.59, 1.65, 0.32, 5))
        part(rig, "ico", "head", V((0.03, -0.09, 1.735)), (0.07, 0.04, 0.04), H, smooth=False, edit=_spikes(0.4, 9, -1))   # fringe tuft
    elif style == "spiky":
        cap((0.116, 0.126, 0.14), fz=1.705, bz=1.59, sz=1.65)
        from mathutils import Vector as Vv
        dirs = [(0, 0, 1), (0.45, 0.1, 0.9), (-0.45, 0.1, 0.9), (0.1, -0.5, 0.86), (-0.15, 0.5, 0.85), (0.6, 0.45, 0.66),
                (-0.6, 0.45, 0.66), (0.62, -0.25, 0.74), (-0.62, -0.25, 0.74), (0.0, 0.75, 0.66), (0.3, -0.6, 0.74), (-0.3, -0.6, 0.74)]
        for i, d in enumerate(dirs):
            d = Vv(d).normalized(); L = 0.10 + 0.03 * ((i * 5) % 3)
            pos = Vv(HC) + Vv((d.x * 0.10, d.y * 0.11, d.z * 0.12)) + d * (L * 0.35)
            rot = Vv((0, 0, 1)).rotation_difference(d).to_euler()
            part(rig, "cone", "head", pos, (0.045, 0.045, L), H, rot=tuple(rot), smooth=False, seg=6)
    elif style == "long":
        cap((0.122, 0.132, 0.145), fz=1.70, bz=1.50, sz=1.56)
        part(rig, "ico", "head", V((0, 0.005, 1.73)), (0.13, 0.14, 0.10), H, smooth=False, edit=cut_edit(1.715, 1.52, 1.60, 0.18, 11))
        def keep_back(c): return not (c.y < -0.04 and c.z > 1.50) and c.z > 1.43
        def ed(o, loc):
            for v in o.data.vertices: v.co += loc
            _cut(o, keep_back)
            for v in o.data.vertices: v.co -= loc
        part(rig, "sph", "head", V((0, 0.03, 1.60)), (0.135, 0.12, 0.15), H, seg=20, edit=ed)
    elif style == "ponytail":
        cap((0.116, 0.126, 0.14), fz=1.705, bz=1.585, sz=1.645)
        part(rig, "sph", "head", V((0, 0.125, 1.68)), (0.03, 0.03, 0.03), PAL["dark"])          # band
        part(rig, "cone", "head", V((0, 0.18, 1.62)), (0.055, 0.055, 0.17), H, rot=(math.radians(-150), 0, 0), seg=12)
    elif style == "curly":
        cap((0.114, 0.124, 0.138), fz=1.705, bz=1.59, sz=1.65)
        import random; rnd = random.Random(4)
        n = 0
        for k in range(200):
            th = rnd.uniform(0, 2 * math.pi); ph = rnd.uniform(0, math.radians(100))
            d = V((math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th), math.cos(ph)))
            p = V(HC) + V((d.x * 0.125, d.y * 0.135, d.z * 0.15))
            if not _hairline(1.715, 1.60, 1.655)(p): continue
            part(rig, "ico1", "head", p, (0.034, 0.034, 0.034), H, smooth=False); n += 1
            if n >= 70: break

def join_parts(rig):
    """one mesh object per bone (fewer draw calls = much faster renders); hair stays its own object for a clean outline"""
    groups = {}
    for o in list(bpy.data.objects):
        if o.parent == rig and o.type == "MESH":
            is_hair = any(m.name == "m_" + PAL["hair"] for m in o.data.materials)
            groups.setdefault((o.parent_bone, is_hair), []).append(o)
    for objs in groups.values():
        if len(objs) < 2: continue
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()

def build_ball(root):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.12)
    b = bpy.context.object; bpy.ops.object.shade_smooth(); b.data.materials.append(mat("#e2701e")); b.parent = root
    for r in ((0, 0, 0), (math.pi / 2, 0, 0)):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.121, minor_radius=0.006, rotation=r)
        s = bpy.context.object; s.data.materials.append(mat("#2a140a")); s.parent = b
    return b

# ----------------------------------------------------------------------------- posing
CAL = {}
def calibrate(rig):
    vl = bpy.context.view_layer
    for pb in rig.pose.bones:
        side = 1 if pb.name.endswith(".L") else -1; res = {}
        for ax in (0, 2):
            pb.rotation_euler = (0, 0, 0); vl.update(); t0 = (rig.matrix_world @ pb.tail).copy()
            e = [0, 0, 0]; e[ax] = math.radians(10); pb.rotation_euler = e; vl.update(); res[ax] = (rig.matrix_world @ pb.tail) - t0
        pb.rotation_euler = (0, 0, 0)
        d = Vector(pb.bone.tail_local - pb.bone.head_local).normalized()
        if abs(d.z) > 0.7:
            fwd = -1 if res[0].y > 0 else 1
            out = (1 if res[2].x * side > 0 else -1) if pb.name[-2:] in (".L", ".R") else (1 if res[2].x > 0 else -1)
        else:
            fwd = 1 if res[0].z < 0 else -1; out = 1
        CAL[pb.name] = (fwd, out)
    vl.update()

LAST = {}
def pose(rig, P):
    LAST["P"] = P
    for pb in rig.pose.bones:
        f, o, t = P.get(pb.name, (0, 0, 0)); cf, co = CAL[pb.name]
        pb.rotation_euler = (math.radians(f * cf), math.radians(t), math.radians(o * co))

def ground(rig, lift=0.0):
    vl = bpy.context.view_layer; rig.location = (0, 0, 0); vl.update()
    M = rig.matrix_local; pb = rig.pose.bones; z = []
    for s in ("L", "R"):
        z += [(M @ pb[f"foot.{s}"].head).z - 0.065, (M @ pb[f"foot.{s}"].tail).z - 0.02,
              (M @ pb[f"shin.{s}"].head).z - 0.07, (M @ pb[f"hand.{s}"].tail).z - 0.04, (M @ pb[f"forearm.{s}"].head).z - 0.05]
    z += [(M @ pb["hips"].head).z - 0.14, (M @ pb["spine"].tail).z - 0.14, (M @ pb["head"].tail).z - 0.05,
          (M @ pb["head"].head).z - 0.1, (M @ pb["spine"].head).z - 0.13]
    rig.location.z = -min(z) + lift; vl.update()
    LAST["z"] = rig.location.z

def wpos(rig, bone, tail=True):
    """bone position in the character's root space"""
    pb = rig.pose.bones[bone]; return rig.matrix_local @ (pb.tail if tail else pb.head)
def lerp(a, b, t): return a + (b - a) * t
def smooth(t): t = max(0, min(1, t)); return t * t * (3 - 2 * t)

def blend_keys(keys, t):
    for i in range(len(keys) - 1):
        t0, p0, e0 = keys[i]; t1, p1, e1 = keys[i + 1]
        if t0 <= t <= t1:
            u = smooth((t - t0) / (t1 - t0) if t1 > t0 else 0); P = {}
            for n in set(p0) | set(p1):
                a = p0.get(n, (0, 0, 0)); b = p1.get(n, (0, 0, 0)); P[n] = tuple(lerp(a[k], b[k], u) for k in range(3))
            return P, {k: lerp(e0.get(k, 0), e1.get(k, 0), u) for k in set(e0) | set(e1)}
    return keys[-1][1], keys[-1][2]

def gait(p, hip, knee_sw, knee_base, ank, arm, elbow, lean, twist, back=False, armout=0):
    s = 2 * math.pi * p
    if back: s = -s
    P = {}
    for side, ph in (("L", 0.0), ("R", math.pi)):
        a = s + ph; h = hip * math.sin(a)
        sw = max(0.0, math.cos(a)) if not back else max(0.0, -math.cos(a))
        k = knee_base + knee_sw * sw ** 1.4 + 6 * max(0, math.sin(a)) * (0 if back else 1)
        P[f"thigh.{side}"] = (h, 2, 0); P[f"shin.{side}"] = (-k, 0, 0)
        P[f"foot.{side}"] = (ank * math.sin(a - 0.6) - 0.35 * h + 0.2 * k, 0, 0)
        P[f"upperarm.{side}"] = (-arm * math.sin(a), 8 + armout, 0)
        P[f"forearm.{side}"] = (elbow + 0.35 * arm * max(0, -math.sin(a)), 0, 0)
    P["spine"] = (lean, 0, twist * math.sin(s)); P["hips"] = (lean * 0.3, 0, -twist * 0.6 * math.sin(s))
    P["neck"] = (-lean * 0.6, 0, -twist * 0.5 * math.sin(s))
    return P

LOCO = {
    "walk": dict(hip=24, knee_sw=48, knee_base=6, ank=12, arm=22, elbow=18, lean=3, twist=7, flight=0.0),
    "jog": dict(hip=30, knee_sw=78, knee_base=14, ank=16, arm=34, elbow=78, lean=8, twist=9, flight=0.035),
    "run": dict(hip=44, knee_sw=105, knee_base=16, ank=22, arm=52, elbow=88, lean=15, twist=11, flight=0.07),
    "backpedal": dict(hip=22, knee_sw=55, knee_base=22, ank=12, arm=16, elbow=60, lean=-7, twist=5, flight=0.015, back=True, armout=14),
    "dribble_run": dict(hip=32, knee_sw=82, knee_base=16, ank=16, arm=30, elbow=75, lean=11, twist=8, flight=0.03),
}
# move: (loop, frames factor, fps at 24-frame base or 48 for loco)
MOVES = {
    "walk": (True, 1, 30), "jog": (True, 1, 36), "run": (True, 1, 42), "backpedal": (True, 1, 32), "dribble_run": (True, 1, 38),
    "idle": (True, 1, 8), "dribble": (True, 1, 20), "lowdrib": (True, 1, 26), "post": (True, 1, 18),
    "defend": (True, 1, 12), "defense_slide": (True, 1, 20),
    "shoot": (False, 1.25, 26), "pump": (False, 0.85, 26), "hook": (False, 1, 24), "layup": (False, 1.25, 26), "dunk": (False, 1.25, 26),
    "block": (False, 1, 24), "rebound": (False, 1, 24),
    "pass_chest": (False, 0.85, 26), "pass_bounce": (False, 0.85, 26), "overhead": (True, 1, 10), "pickup": (False, 0.85, 22),
    "point": (True, 0.85, 10), "celebrate": (True, 1, 14), "stumble": (False, 0.85, 22), "down": (False, 1, 20),
}

STAND = {"thigh.L": (3, 5, 0), "thigh.R": (3, 5, 0), "shin.L": (-5, 0, 0), "shin.R": (-5, 0, 0), "foot.L": (2, 0, 0), "foot.R": (2, 0, 0),
         "upperarm.L": (6, 8, 0), "upperarm.R": (6, 8, 0), "forearm.L": (15, 0, 0), "forearm.R": (15, 0, 0)}
HOLD = {"upperarm.L": (35, 14, 0), "forearm.L": (80, 0, 0), "upperarm.R": (35, 14, 0), "forearm.R": (85, 0, 0)}
CROUCH = {"hips": (10, 0, 0), "spine": (10, 0, 0), "neck": (-10, 0, 0), "thigh.L": (48, 7, 0), "thigh.R": (48, 7, 0),
          "shin.L": (-82, 0, 0), "shin.R": (-82, 0, 0), "foot.L": (32, 0, 0), "foot.R": (32, 0, 0)}
def M(*ds):
    out = {}
    for d in ds: out.update(d)
    return out

def chest(rig): return (wpos(rig, "hand.R") + wpos(rig, "hand.L")) / 2 + Vector((0, -0.10, 0.02))

def move_pose(rig, ball, move, f, n):
    """Pose rig (at root origin, unrotated) for frame f/n; returns ball position or None."""
    p = f / n; t = f / max(1, n - 1); bp = None; V = Vector
    if move == "rest":   # measurement pose for measure.py: rest pose, arms straight down
        pose(rig, {}); ground(rig); return None
    if move in LOCO:
        c = dict(LOCO[move]); fl = c.pop("flight"); P = gait(p, **c)
        if move == "dribble_run":
            push = 0.5 - 0.5 * math.cos(4 * math.pi * p)
            P.update({"upperarm.R": (30 + 8 * push, 16, 0), "forearm.R": (62 - 38 * push, 0, 0), "hand.R": (25 - 25 * push, 0, 0)})
        pose(rig, P); ground(rig, fl * max(0.0, math.sin(4 * math.pi * p - 0.8)))
        if move == "dribble_run":
            h = wpos(rig, "hand.R"); u = abs(math.cos(2 * math.pi * p))
            bp = V((h.x - 0.03, h.y - 0.16, 0.12 + (h.z - 0.13 - 0.12) * u))
    elif move == "idle":
        b = math.sin(2 * math.pi * p)
        pose(rig, M(STAND, {"spine": (2 + 1.5 * b, 0, 0), "neck": (-2 - b, 0, 0), "thigh.L": (4, 4, 0), "thigh.R": (-2, 6, 0),
                            "shin.L": (-8, 0, 0), "upperarm.R": (12, 12, 0), "forearm.R": (40 + 2 * b, 0, 0), "forearm.L": (18 + 2 * b, 0, 0)}))
        ground(rig); bp = wpos(rig, "hand.R") + V((-0.06, -0.08, -0.02))
    elif move in ("dribble", "lowdrib", "post"):
        per = 2 if move == "lowdrib" else 1
        c = math.cos(2 * math.pi * p * per); push = 0.5 - 0.5 * c; sway = math.sin(2 * math.pi * p)
        if move == "dribble":
            P = {"hips": (8, 0, 0), "spine": (14, 0, 6), "neck": (-14, 0, 0), "thigh.L": (28, 8, 0), "thigh.R": (14, 10, 0),
                 "shin.L": (-40, 0, 0), "shin.R": (-34, 0, 0), "foot.L": (12, 0, 0), "foot.R": (16, 0, 0),
                 "upperarm.L": (20 + 4 * sway, 22, 0), "forearm.L": (55, 0, 0),
                 "upperarm.R": (22 + 10 * push, 18, 0), "forearm.R": (70 - 45 * push, 0, 0), "hand.R": (30 - 30 * push, 0, 0)}
            fwd, side = -0.10, -0.02
        elif move == "lowdrib":
            P = {"hips": (12, 0, 0), "spine": (30, 0, 10), "neck": (-28, 0, 0), "thigh.L": (52, 15, 0), "thigh.R": (40, 15, 0),
                 "shin.L": (-80, 0, 0), "shin.R": (-70, 0, 0), "foot.L": (28, 0, 0), "foot.R": (26, 0, 0),
                 "upperarm.L": (58, 38, 0), "forearm.L": (45, 0, 0),
                 "upperarm.R": (8 + 8 * push, 26, 0), "forearm.R": (35 - 25 * push, 0, 0), "hand.R": (20 - 20 * push, 0, 0)}
            fwd, side = -0.06, -0.04
        else:  # post: back to the basket, wide and low, off-arm feeling the defender
            P = {"hips": (14, 0, 0), "spine": (24, 0, -8 * sway), "neck": (-20, 0, 0), "thigh.L": (32, 22, 0), "thigh.R": (32, 22, 0),
                 "shin.L": (-55, 0, 0), "shin.R": (-55, 0, 0), "foot.L": (18, -10, 0), "foot.R": (18, -10, 0),
                 "upperarm.L": (-25, 55, 0), "forearm.L": (50, 0, 0),
                 "upperarm.R": (12 + 8 * push, 22, 0), "forearm.R": (50 - 35 * push, 0, 0), "hand.R": (20 - 20 * push, 0, 0)}
            fwd, side = -0.04, -0.06
        pose(rig, P); ground(rig)
        h = wpos(rig, "hand.R"); u = abs(math.cos(math.pi * p * per))
        bp = V((h.x + side, h.y + fwd, 0.12 + (h.z - 0.13 - 0.12) * u))
    elif move in ("defense_slide", "defend"):
        s = math.sin(2 * math.pi * p); w = 0.5 + 0.5 * s if move == "defense_slide" else 0.6
        P = {"hips": (14, 0, 0), "spine": (18, 0, 0), "neck": (-22, 0, 0),
             "thigh.L": (34, 16 + 14 * w, 0), "thigh.R": (34, 16 + 14 * w, 0), "shin.L": (-58, 0, 0), "shin.R": (-58, 0, 0),
             "foot.L": (20, -12 - 10 * w, 0), "foot.R": (20, -12 - 10 * w, 0)}
        if move == "defense_slide":
            P.update({"upperarm.L": (25, 62 + 8 * s, 0), "forearm.L": (20, 0, 0), "upperarm.R": (25, 62 - 8 * s, 0), "forearm.R": (20, 0, 0)})
            pose(rig, P); ground(rig, 0.02 * max(0, -s))
        else:
            P.update({"upperarm.L": (120 + 30 * s, 30, 0), "forearm.L": (30, 0, 0), "upperarm.R": (35 - 15 * s, 60, 0), "forearm.R": (25, 0, 0),
                      "spine": (18, 0, 6 * s)})
            pose(rig, P); ground(rig, 0.012 * (1 + math.sin(4 * math.pi * p)))
    elif move == "shoot":
        up = {"spine": (-2, 0, 0), "thigh.L": (8, 3, 0), "thigh.R": (-4, 3, 0), "shin.L": (-25, 0, 0), "shin.R": (-12, 0, 0),
              "foot.L": (-25, 0, 0), "foot.R": (-30, 0, 0), "upperarm.L": (150, 10, 0), "forearm.L": (70, 0, 0),
              "upperarm.R": (160, 12, 0), "forearm.R": (95, 0, 0)}
        rel = M(up, {"upperarm.R": (170, 8, 0), "forearm.R": (10, 0, 0), "hand.R": (60, 0, 0), "upperarm.L": (150, 18, 0), "forearm.L": (40, 0, 0)})
        keys = [(0, M(STAND, HOLD), {"air": 0}), (0.22, M(CROUCH, HOLD), {"air": 0}), (0.40, up, {"air": 0.30}),
                (0.52, rel, {"air": 0.42}), (0.72, rel, {"air": 0.25}), (0.88, M(CROUCH, HOLD), {"air": 0}), (1.0, M(STAND, HOLD), {"air": 0})]
        P, E = blend_keys(keys, t); pose(rig, P); ground(rig, E["air"])
        if t < 0.52: bp = chest(rig)
        else:
            k = (t - 0.52) / 0.48; r0 = wpos(rig, "hand.R"); bp = V((r0.x, -0.15 - 2.2 * k, 2.25 + 1.6 * k - 2.0 * k * k))
    elif move == "pump":
        fake = M(STAND, {"thigh.L": (6, 6, 0), "thigh.R": (6, 6, 0), "shin.L": (-8, 0, 0), "shin.R": (-8, 0, 0),
                         "upperarm.L": (150, 12, 0), "forearm.L": (75, 0, 0), "upperarm.R": (155, 12, 0), "forearm.R": (90, 0, 0), "neck": (-8, 0, 0)})
        keys = [(0, M(CROUCH, HOLD), {}), (0.4, fake, {}), (0.55, fake, {}), (0.85, M(CROUCH, HOLD), {}), (1, M(CROUCH, HOLD), {})]
        P, E = blend_keys(keys, t); pose(rig, P); ground(rig); bp = chest(rig)
    elif move == "hook":
        hold = M(STAND, HOLD)
        step = M(hold, {"thigh.L": (35, 8, 0), "shin.L": (-30, 0, 0), "thigh.R": (-10, 8, 0), "spine": (6, 0, 25), "neck": (0, 0, -20),
                        "upperarm.L": (80, 50, 0), "forearm.L": (40, 0, 0), "upperarm.R": (20, 70, 0), "forearm.R": (30, 0, 0)})
        sweep = M(step, {"thigh.R": (60, 6, 0), "shin.R": (-90, 0, 0), "thigh.L": (5, 6, 0), "shin.L": (-10, 0, 0), "foot.L": (-25, 0, 0),
                         "upperarm.R": (20, 165, 0), "forearm.R": (15, 0, 0), "hand.R": (40, 0, 0), "spine": (-4, -10, 30)})
        keys = [(0, hold, {"air": 0}), (0.3, step, {"air": 0}), (0.55, sweep, {"air": 0.25}), (0.7, sweep, {"air": 0.28}),
                (0.9, M(CROUCH, {"upperarm.L": (40, 30, 0), "upperarm.R": (30, 30, 0)}), {"air": 0}), (1, M(STAND), {"air": 0})]
        P, E = blend_keys(keys, t); pose(rig, P); ground(rig, E["air"])
        if t < 0.3: bp = chest(rig)
        elif t < 0.62: bp = wpos(rig, "hand.R") + V((0, 0, 0.08))
        else:
            k = (t - 0.62) / 0.38; h = V((0.0, 0.0, 2.3)); bp = h + V((0, -1.6 * k, 1.2 * k - 1.4 * k * k))
    elif move == "layup":
        gather = M(HOLD, {"thigh.R": (35, 6, 0), "shin.R": (-25, 0, 0), "thigh.L": (-20, 6, 0), "shin.L": (-45, 0, 0), "spine": (10, 0, 0)})
        take = M(gather, {"thigh.L": (10, 4, 0), "shin.L": (-20, 0, 0), "foot.L": (-25, 0, 0), "thigh.R": (95, 4, 0), "shin.R": (-105, 0, 0),
                          "upperarm.R": (120, 10, 0), "forearm.R": (60, 0, 0), "upperarm.L": (90, 15, 0), "forearm.L": (60, 0, 0)})
        peak = M(take, {"upperarm.R": (168, 8, 0), "forearm.R": (8, 0, 0), "hand.R": (40, 0, 0), "upperarm.L": (70, 25, 0), "forearm.L": (50, 0, 0),
                        "spine": (-2, 0, 0)})
        land = M(CROUCH, {"upperarm.L": (40, 25, 0), "upperarm.R": (40, 25, 0), "forearm.L": (40, 0, 0), "forearm.R": (40, 0, 0)})
        keys = [(0, gather, {"air": 0}), (0.25, gather, {"air": 0}), (0.45, take, {"air": 0.2}), (0.62, peak, {"air": 0.55}),
                (0.74, peak, {"air": 0.5}), (0.92, land, {"air": 0}), (1, M(STAND), {"air": 0})]
        P, E = blend_keys(keys, t); pose(rig, P); ground(rig, E["air"])
        if t < 0.4: bp = chest(rig)
        elif t < 0.72: bp = wpos(rig, "hand.R") + V((0, -0.04, 0.08))
        else:
            k = (t - 0.72) / 0.28; bp = V((0.2, -0.3 - 0.8 * k, 2.75 + 0.3 * k - 0.6 * k * k))
    elif move == "dunk":
        up = M({"thigh.L": (20, 4, 0), "thigh.R": (60, 4, 0), "shin.L": (-40, 0, 0), "shin.R": (-80, 0, 0), "foot.L": (-30, 0, 0), "foot.R": (-20, 0, 0),
                "upperarm.L": (170, 10, 0), "forearm.L": (30, 0, 0), "upperarm.R": (170, 10, 0), "forearm.R": (30, 0, 0), "spine": (-12, 0, 0), "neck": (5, 0, 0)})
        cock = M(up, {"upperarm.L": (195, 10, 0), "upperarm.R": (195, 10, 0), "forearm.L": (60, 0, 0), "forearm.R": (60, 0, 0), "spine": (-18, 0, 0)})
        slam = M(up, {"upperarm.L": (110, 12, 0), "upperarm.R": (110, 12, 0), "forearm.L": (10, 0, 0), "forearm.R": (10, 0, 0), "spine": (20, 0, 0),
                      "thigh.L": (45, 10, 0), "thigh.R": (45, 10, 0), "shin.L": (-70, 0, 0), "shin.R": (-70, 0, 0)})
        keys = [(0, M(STAND, HOLD), {"air": 0}), (0.25, M(CROUCH, HOLD, {"thigh.L": (65, 8, 0), "thigh.R": (65, 8, 0), "shin.L": (-100, 0, 0), "shin.R": (-100, 0, 0), "spine": (30, 0, 0)}), {"air": 0}),
                (0.45, up, {"air": 0.55}), (0.58, cock, {"air": 0.85}), (0.70, slam, {"air": 0.8}), (0.80, slam, {"air": 0.55}),
                (0.92, M(CROUCH, {"upperarm.L": (50, 30, 0), "upperarm.R": (50, 30, 0)}), {"air": 0}), (1, M(STAND), {"air": 0})]
        P, E = blend_keys(keys, t); pose(rig, P); ground(rig, E["air"])
        if t < 0.7: bp = chest(rig) if t < 0.3 else (wpos(rig, "hand.R") + wpos(rig, "hand.L")) / 2 + V((0, -0.06, 0.06))
        else:
            k = (t - 0.7) / 0.3; bp = V((0, -0.55, max(0.12, 2.9 - 6 * k * k)))
    elif move in ("block", "rebound"):
        reach = M({"thigh.L": (12, 6, 0), "thigh.R": (5, 6, 0), "shin.L": (-25, 0, 0), "shin.R": (-15, 0, 0), "foot.L": (-30, 0, 0), "foot.R": (-30, 0, 0),
                   "upperarm.L": (172, 14, 0), "forearm.L": (8, 0, 0), "upperarm.R": (172, 14, 0), "forearm.R": (8, 0, 0), "neck": (12, 0, 0)})
        if move == "block":
            keys = [(0, M(STAND), {"air": 0}), (0.2, M(CROUCH, {"upperarm.L": (60, 20, 0), "upperarm.R": (60, 20, 0)}), {"air": 0}),
                    (0.45, reach, {"air": 0.55}), (0.6, reach, {"air": 0.6}), (0.85, M(CROUCH), {"air": 0}), (1, M(STAND), {"air": 0})]
            P, E = blend_keys(keys, t); pose(rig, P); ground(rig, E["air"])
        else:
            catch = M(reach, {"forearm.L": (30, 0, 0), "forearm.R": (30, 0, 0)})
            chin = M(CROUCH, {"upperarm.L": (40, 40, 0), "forearm.L": (110, 0, 0), "upperarm.R": (40, 40, 0), "forearm.R": (110, 0, 0),
                              "thigh.L": (40, 18, 0), "thigh.R": (40, 18, 0)})
            keys = [(0, M(STAND), {"air": 0}), (0.2, M(CROUCH, {"upperarm.L": (70, 20, 0), "upperarm.R": (70, 20, 0)}), {"air": 0}),
                    (0.45, catch, {"air": 0.55}), (0.55, catch, {"air": 0.55}), (0.8, chin, {"air": 0.05}), (1, chin, {"air": 0})]
            P, E = blend_keys(keys, t); pose(rig, P); ground(rig, E["air"])
            if t >= 0.45: bp = (wpos(rig, "hand.R") + wpos(rig, "hand.L")) / 2 + V((0, -0.06, 0.06))
            else:
                k = t / 0.45; bp = V((0.05, -0.35 + 0.25 * k, 3.6 - 1.0 * k))
    elif move in ("pass_chest", "pass_bounce"):
        hold = M({"spine": (6, 0, 0), "thigh.L": (10, 6, 0), "thigh.R": (-6, 6, 0), "shin.L": (-18, 0, 0), "shin.R": (-10, 0, 0)},
                 {"upperarm.L": (40, 18, 0), "forearm.L": (95, 0, 0), "upperarm.R": (40, 18, 0), "forearm.R": (95, 0, 0)})
        step = M(hold, {"spine": (14, 0, 0), "thigh.L": (34, 6, 0), "thigh.R": (-22, 6, 0), "shin.L": (-30, 0, 0), "shin.R": (-14, 0, 0), "foot.R": (-15, 0, 0)})
        a = 82 if move == "pass_chest" else 50
        ext = M(step, {"upperarm.L": (a, 6, 0), "forearm.L": (8, 0, 0), "upperarm.R": (a, 6, 0), "forearm.R": (8, 0, 0), "hand.L": (40, 0, 0), "hand.R": (40, 0, 0)})
        keys = [(0, hold, {}), (0.35, step, {}), (0.55, ext, {}), (0.8, ext, {}), (1.0, hold, {})]
        P, E = blend_keys(keys, t); pose(rig, P); ground(rig)
        mid = (wpos(rig, "hand.R") + wpos(rig, "hand.L")) / 2 + V((0, -0.12, 0.03))
        if t < 0.5: bp = mid
        elif t < 0.85:
            k = (t - 0.5) / 0.35
            if move == "pass_chest": bp = mid + V((0, -2.6 * k, 0))
            else:
                z = mid.z * (1 - k / 0.6) if k < 0.6 else 0.12 + (k - 0.6) * 1.5
                bp = V((mid.x, mid.y - 2.4 * k, max(0.12, z)))
    elif move == "overhead":
        s = math.sin(2 * math.pi * p)
        pose(rig, M(STAND, {"upperarm.L": (165, 16, 0), "forearm.L": (40, 0, 0), "upperarm.R": (165, 16, 0), "forearm.R": (40, 0, 0),
                            "spine": (2, 0, 12 * s), "neck": (-6, 0, -6 * s), "thigh.L": (6, 10, 0), "thigh.R": (6, 10, 0)}))
        ground(rig); bp = (wpos(rig, "hand.R") + wpos(rig, "hand.L")) / 2 + V((0, -0.02, 0.1))
    elif move == "pickup":
        bend = {"hips": (20, 0, 0), "spine": (55, 0, 0), "neck": (-30, 0, 0), "thigh.L": (55, 10, 0), "thigh.R": (40, 10, 0),
                "shin.L": (-80, 0, 0), "shin.R": (-60, 0, 0), "foot.L": (25, 0, 0), "foot.R": (20, 0, 0),
                "upperarm.L": (50, 12, 0), "forearm.L": (10, 0, 0), "upperarm.R": (50, 12, 0), "forearm.R": (10, 0, 0)}
        keys = [(0, M(STAND), {}), (0.4, bend, {}), (0.5, bend, {}), (1, M(STAND, HOLD), {})]
        P, E = blend_keys(keys, t); pose(rig, P); ground(rig)
        floor = V((0, -0.45, 0.12))
        bp = floor if t < 0.45 else (wpos(rig, "hand.R") + wpos(rig, "hand.L")) / 2 + V((0, -0.08, 0.0))
        if t >= 0.45 and t < 0.6: bp = floor.lerp(bp, (t - 0.45) / 0.15)
    elif move == "point":
        b = math.sin(2 * math.pi * p)
        pose(rig, M(STAND, {"upperarm.R": (85 + 4 * b, 35, 0), "forearm.R": (5, 0, 0), "hand.R": (0, 0, 0), "spine": (0, 0, -15),
                            "neck": (0, 0, -12), "upperarm.L": (10, 10, 0), "forearm.L": (30, 0, 0)}))
        ground(rig)
    elif move == "celebrate":
        s = math.sin(2 * math.pi * p); a = 0.5 + 0.5 * s
        pose(rig, M(STAND, {"upperarm.L": (lerp(60, 165, a), 30, 0), "forearm.L": (lerp(120, 40, a), 0, 0),
                            "upperarm.R": (lerp(165, 60, a), 30, 0), "forearm.R": (lerp(40, 120, a), 0, 0),
                            "spine": (-5, 0, 8 * s), "neck": (-15, 0, 0), "thigh.L": (8, 8, 0), "thigh.R": (8, 8, 0),
                            "shin.L": (-15, 0, 0), "shin.R": (-15, 0, 0)}))
        ground(rig, 0.07 * max(0, math.sin(4 * math.pi * p)))
    elif move == "stumble":
        lurch = {"hips": (15, 0, 0), "spine": (30, 0, 10), "neck": (-20, 0, 0), "thigh.L": (55, 6, 0), "shin.L": (-40, 0, 0), "thigh.R": (-25, 6, 0),
                 "shin.R": (-50, 0, 0), "upperarm.L": (-30, 70, 0), "forearm.L": (40, 0, 0), "upperarm.R": (80, 60, 0), "forearm.R": (30, 0, 0)}
        catch = M(lurch, {"thigh.R": (45, 6, 0), "thigh.L": (-15, 6, 0), "shin.L": (-30, 0, 0), "spine": (20, 0, -10),
                          "upperarm.L": (70, 50, 0), "upperarm.R": (-20, 60, 0)})
        keys = [(0, M(STAND), {}), (0.3, lurch, {}), (0.6, catch, {}), (1, M(STAND), {})]
        P, E = blend_keys(keys, t); pose(rig, P); ground(rig)
    elif move == "down":
        sit = {"hips": (-30, 0, 0), "spine": (20, 0, 0), "thigh.L": (85, 10, 0), "thigh.R": (75, 10, 0), "shin.L": (-80, 0, 0), "shin.R": (-60, 0, 0),
               "upperarm.L": (-40, 30, 0), "forearm.L": (10, 0, 0), "upperarm.R": (-40, 30, 0), "forearm.R": (10, 0, 0)}
        lie = {"hips": (-85, 0, 0), "spine": (-5, 0, 0), "neck": (20, 0, 0), "thigh.L": (35, 12, 0), "thigh.R": (10, 10, 0), "shin.L": (-55, 0, 0),
               "shin.R": (-15, 0, 0), "upperarm.L": (40, 80, 0), "forearm.L": (20, 0, 0), "upperarm.R": (60, 70, 0), "forearm.R": (40, 0, 0)}
        keys = [(0, M(STAND), {}), (0.15, M(STAND, {"spine": (-15, 0, 0), "upperarm.L": (40, 50, 0), "upperarm.R": (40, 50, 0)}), {}),
                (0.45, sit, {}), (0.7, lie, {}), (1, lie, {})]
        P, E = blend_keys(keys, t); pose(rig, P); ground(rig)
    if ball is not None:
        ball.hide_render = bp is None
        for ch in ball.children: ch.hide_render = bp is None
        if bp is not None: ball.location = bp
    return bp

# ----------------------------------------------------------------------------- image helpers (numpy inside Blender)
import numpy as np
def load_px(path):
    img = bpy.data.images.load(path); w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(a); bpy.data.images.remove(img)
    return a.reshape(h, w, 4)
def save_px(arr, path):
    h, w, _ = arr.shape; img = bpy.data.images.new("tmp_save", w, h, alpha=True)
    img.pixels.foreach_set(np.ascontiguousarray(arr, dtype=np.float32).ravel())
    img.filepath_raw = path; img.file_format = "PNG"; img.save(); bpy.data.images.remove(img)

def foot_px(cell_x0=0.0):
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    v = world_to_camera_view(SC, CAM, Vector((cell_x0, 0, 0)))
    W = SC.render.resolution_x
    return round(v.x * W - (W / 2 - A.size / 2) - (cell_x0 / SP) * A.size, 1), round((1 - v.y) * A.size, 1)

def ball_px(ball, rig):
    """ball centre in cell pixels + whether it is in front of the body (camera side)"""
    from bpy_extras.object_utils import world_to_camera_view
    W = SC.render.resolution_x
    v = world_to_camera_view(SC, CAM, ball.matrix_world.translation)
    hips = rig.matrix_world @ rig.pose.bones["spine"].head
    front = ball.matrix_world.translation.y < hips.y - 0.02   # camera is on the -Y side
    return [round(v.x * W, 1), round((1 - v.y) * A.size, 1), 1 if front else 0]

# ----------------------------------------------------------------------------- mannequin run: bald body + 7 hair copies side by side
def run_mannequin():
    variants = ["body"] + HAIR_SEL
    NV = len(variants); set_camera(NV)
    roots, rigs, balls = [], [], []
    for k, v in enumerate(variants):
        r = bpy.data.objects.new(f"root_{v}", None); SC.collection.objects.link(r)
        r.location.x = (k - (NV - 1) / 2) * SP
        rig = build_mannequin(r)
        if v != "body": add_hair(rig, v)
        join_parts(rig)
        roots.append(r); rigs.append(rig); balls.append(build_ball(r))
    calibrate(rigs[0])
    moves = ["rest"] if A.rest else [m for m in MOVES if not A.moves or m in A.moves]
    man = {"size": A.size, "foot": foot_px(roots[0].location.x * 0), "elev": A.elev, "dirs": [d for d, _ in DIRS],
           "palette": A.palette, "palette_colors": PAL, "layers": variants, "hair": HAIR_SEL, "moves": {}}
    man["foot"] = [A.size / 2, foot_px()[1]]
    man["ball_radius"] = round(0.12 * A.size / SP, 2)
    tmp = os.path.join(OUT, "_wide.png")
    for name in moves:
        loop, fac, fps = MOVES.get(name, (False, 1, 1))
        base = A.frames if name in LOCO else A.frames_other
        n = 1 if name == "rest" else max(4, round(base * fac))
        man["moves"][name] = {"frames": n, "fps": round(fps * n / (48 if name in LOCO else 24 * fac), 2), "loop": loop,
                              "ball": {d: [] for d, _ in DIRS}}
        for i in range(n):
            for r in roots: r.rotation_euler.z = 0
            for r in roots: r.location.y = 0
            # pose the first copy (all copies are at their own root, so pose in root space works the same)
            has_ball = move_pose(rigs[0], balls[0], name, i, n) is not None
            for rig, ball in zip(rigs[1:], balls[1:]):
                pose(rig, LAST["P"]); rig.location = rigs[0].location
                ball.location = balls[0].location; ball.hide_render = balls[0].hide_render
                for ch in ball.children: ch.hide_render = balls[0].hide_render
            for b in balls:   # the game draws its own ball: sprites carry only its position
                b.hide_render = True
                for ch in b.children: ch.hide_render = True
            for d, ang in DIRS:
                for r in roots: r.rotation_euler.z = math.radians(ang)
                bpy.context.view_layer.update()
                man["moves"][name]["ball"][d].append(ball_px(balls[0], rigs[0]) if has_ball else None)
                SC.render.filepath = tmp; bpy.ops.render.render(write_still=True)
                wide = load_px(tmp); S = A.size
                cells = [wide[:, k * S:(k + 1) * S] for k in range(NV)]
                body = cells[0]
                fn = f"{name}_{d}_{i:03d}.png"
                os.makedirs(f"{OUT}/body/{name}_{d}", exist_ok=True); save_px(body, f"{OUT}/body/{name}_{d}/{fn}")
                for k in range(1, NV):
                    c = cells[k]; m = (np.abs(c - body).max(axis=2) > 0.012)[..., None]
                    os.makedirs(f"{OUT}/hair_{variants[k]}/{name}_{d}", exist_ok=True)
                    save_px(np.where(m, c, 0.0), f"{OUT}/hair_{variants[k]}/{name}_{d}/{fn}")
            print(f"[moves] {name} {i + 1}/{n}", flush=True)
        with open(f"{OUT}/moves.json", "w") as fh: json.dump(man, fh, indent=1)
    if os.path.exists(tmp): os.remove(tmp)
    print("[moves] valmis ->", OUT)

# ----------------------------------------------------------------------------- FBX mode (one character, no layers)
def import_fbx(path):
    before = set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=os.path.abspath(path), automatic_bone_orientation=True)
    return [o for o in bpy.data.objects if o not in before]

def run_fbx():
    set_camera(1)
    ROOT = bpy.data.objects.new("root", None); SC.collection.objects.link(ROOT)
    MOVER = bpy.data.objects.new("mover", None); SC.collection.objects.link(MOVER); MOVER.parent = ROOT
    objs = import_fbx(A.fbx_model); rig = next(o for o in objs if o.type == "ARMATURE")
    for o in objs:
        if o.parent is None: o.parent = MOVER
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == "MESH" for c in o.bound_box]
    h = max(p.z for p in pts) - min(p.z for p in pts); k = 1.85 / h if h > 0 else 1
    ROOT.scale = (k, k, k)
    if A.fbx_forward == "+Y": ROOT.rotation_euler.z = math.pi
    for o in objs:
        if o.type == "MESH":
            for m in o.data.materials:
                if m and m.node_tree:
                    bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
                    if bsdf: m.diffuse_color = tuple(bsdf.inputs["Base Color"].default_value)
    if any(m and m.node_tree and any(n.type == "TEX_IMAGE" for n in m.node_tree.nodes) for o in objs if o.type == "MESH" for m in o.data.materials):
        SH.color_type = "TEXTURE"
    actions = {}
    if rig.animation_data and rig.animation_data.action and not A.fbx_anim: actions["anim"] = rig.animation_data.action
    for spec in A.fbx_anim:
        name, path = spec.split("=", 1) if "=" in spec else (os.path.splitext(os.path.basename(spec))[0].lower(), spec)
        new = import_fbx(path); r2 = next((o for o in new if o.type == "ARMATURE"), None)
        if r2 and r2.animation_data and r2.animation_data.action: actions[name] = r2.animation_data.action
        for o in new: bpy.data.objects.remove(o, do_unlink=True)
    if rig.animation_data is None: rig.animation_data_create()
    hips = next((b for b in rig.pose.bones if "hips" in b.name.lower()), rig.pose.bones[0])
    base_rot = ROOT.rotation_euler.z
    man = {"size": A.size, "foot": [A.size / 2, foot_px()[1]], "elev": A.elev, "dirs": [d for d, _ in DIRS], "moves": {}}
    for name, act in actions.items():
        if A.moves and name not in A.moves: continue
        n = A.frames if name in LOCO else A.frames_other
        rig.animation_data.action = act
        if hasattr(act, "slots") and len(act.slots): rig.animation_data.action_slot = act.slots[0]
        f0, f1 = act.frame_range
        ROOT.rotation_euler.z = base_rot; MOVER.location = (0, 0, 0)
        def hl(fr):
            SC.frame_set(int(fr)); bpy.context.view_layer.update()
            return ROOT.matrix_world.inverted() @ (rig.matrix_world @ hips.head)
        p0 = hl(f0); p1 = hl(f1)
        man["moves"][name] = {"frames": n, "fps": round(n / max(0.1, (f1 - f0) / SC.render.fps), 2), "loop": True}
        for i in range(n):
            fr = f0 + (f1 - f0) * i / n; SC.frame_set(int(fr), subframe=fr - int(fr))
            c = p0.lerp(p1, i / n); MOVER.location = (-c.x, -c.y, 0)
            for d, ang in DIRS:
                ROOT.rotation_euler.z = base_rot + math.radians(ang)
                os.makedirs(f"{OUT}/{name}_{d}", exist_ok=True)
                SC.render.filepath = f"{OUT}/{name}_{d}/{name}_{d}_{i:03d}.png"; bpy.ops.render.render(write_still=True)
            print(f"[moves] {name} {i + 1}/{n}", flush=True)
    with open(f"{OUT}/moves.json", "w") as fh: json.dump(man, fh, indent=1)
    print("[moves] valmis ->", OUT)

def export_test_fbx(path, move="jog", n=24):
    root = bpy.data.objects.new("root", None); SC.collection.objects.link(root)
    rig = build_mannequin(root); calibrate(rig)
    for i in range(n + 1):
        SC.frame_set(i + 1); move_pose(rig, None, move, i % n, n)
        rig.location.x += 0.05 * i; rig.keyframe_insert("location", frame=i + 1); rig.location.x = 0
        for pb in rig.pose.bones: pb.keyframe_insert("rotation_euler", frame=i + 1)
    bpy.ops.object.select_all(action="SELECT"); root.select_set(False); CAM.select_set(False)
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, bake_anim=True, add_leaf_bones=False)
    print("[moves] test fbx ->", path)

if A.export_test_fbx: export_test_fbx(A.export_test_fbx)
elif A.fbx_model: run_fbx()
else: run_mannequin()
