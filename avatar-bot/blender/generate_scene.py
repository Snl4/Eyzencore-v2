"""
Generate minecraft_avatar.blend with Steve mesh, Skin material and pose cameras.
Run once: blender --background --python avatar-bot/blender/generate_scene.py
"""
import os
import bpy
import bmesh
from mathutils import Vector, Euler
import math

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BLEND_OUTPUT = os.environ.get(
    "AVATAR_BOT_BLEND_FILE",
    os.path.join(SCRIPT_DIR, "minecraft_avatar.blend"),
)
PIXEL = 0.0625


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def skin_uv_corners(x: float, y: float, w: float, h: float, size: float = 64.0) -> list[tuple[float, float]]:
    u0 = x / size
    u1 = (x + w) / size
    v0 = 1.0 - (y + h) / size
    v1 = 1.0 - y / size
    return [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]


def create_skin_material() -> bpy.types.Material:
    material = bpy.data.materials.new(name="Skin")
    material.use_nodes = True
    node_tree = material.node_tree
    for node in list(node_tree.nodes):
        node_tree.nodes.remove(node)
    output = node_tree.nodes.new("ShaderNodeOutputMaterial")
    bsdf = node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    texture = node_tree.nodes.new("ShaderNodeTexImage")
    texture.name = "SkinTexture"
    texture.label = "SkinTexture"
    texture.interpolation = "Closest"
    bsdf.inputs["Roughness"].default_value = 0.82
    node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    node_tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return material


def create_minecraft_box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    face_uvs: list[tuple[float, float, float, float]],
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.faces.ensure_lookup_table()
    uv_layer = bm.loops.layers.uv.new()
    for face_index, face in enumerate(bm.faces):
        rect = face_uvs[face_index]
        corners = skin_uv_corners(rect[0], rect[1], rect[2], rect[3])
        for loop_index, loop in enumerate(face.loops):
            loop[uv_layer].uv = corners[loop_index]
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    obj.scale = scale
    return obj


def build_avatar(material: bpy.types.Material) -> bpy.types.Object:
    parts: list[bpy.types.Object] = []
    head_uvs = [
        (0, 8, 8, 8),
        (16, 8, 8, 8),
        (8, 0, 8, 8),
        (16, 0, 8, 8),
        (8, 8, 8, 8),
        (24, 8, 8, 8),
    ]
    parts.append(create_minecraft_box("Head", (0, 0, 1.75), (0.5, 0.5, 0.5), head_uvs))
    body_uvs = [
        (16, 20, 4, 12),
        (28, 20, 4, 12),
        (20, 16, 8, 4),
        (28, 16, 8, 4),
        (20, 20, 8, 12),
        (32, 20, 8, 12),
    ]
    parts.append(create_minecraft_box("Body", (0, 0, 1.125), (0.5, 0.75, 0.25), body_uvs))
    right_arm_uvs = [
        (40, 20, 4, 12),
        (48, 20, 4, 12),
        (44, 16, 4, 4),
        (48, 16, 4, 4),
        (44, 20, 4, 12),
        (52, 20, 4, 12),
    ]
    parts.append(create_minecraft_box("RightArm", (-0.375, 0, 1.125), (0.25, 0.75, 0.25), right_arm_uvs))
    left_arm_uvs = [
        (32, 52, 4, 12),
        (40, 52, 4, 12),
        (36, 48, 4, 4),
        (40, 48, 4, 4),
        (36, 52, 4, 12),
        (44, 52, 4, 12),
    ]
    parts.append(create_minecraft_box("LeftArm", (0.375, 0, 1.125), (0.25, 0.75, 0.25), left_arm_uvs))
    right_leg_uvs = [
        (0, 20, 4, 12),
        (8, 20, 4, 12),
        (4, 16, 4, 4),
        (8, 16, 4, 4),
        (4, 20, 4, 12),
        (12, 20, 4, 12),
    ]
    parts.append(create_minecraft_box("RightLeg", (-0.125, 0, 0.375), (0.25, 0.75, 0.25), right_leg_uvs))
    left_leg_uvs = [
        (16, 52, 4, 12),
        (24, 52, 4, 12),
        (20, 48, 4, 4),
        (24, 48, 4, 4),
        (20, 52, 4, 12),
        (28, 52, 4, 12),
    ]
    parts.append(create_minecraft_box("LeftLeg", (0.125, 0, 0.375), (0.25, 0.75, 0.25), left_leg_uvs))
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.data.materials.append(material)
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    avatar = bpy.context.active_object
    avatar.name = "Avatar"
    return avatar


def add_camera(name: str, location: tuple[float, float, float], rotation: tuple[float, float, float]) -> bpy.types.Object:
    camera_data = bpy.data.cameras.new(name)
    camera_data.type = "PERSP"
    camera_object = bpy.data.objects.new(name, camera_data)
    bpy.context.collection.objects.link(camera_object)
    camera_object.location = Vector(location)
    camera_object.rotation_euler = Euler((math.radians(rotation[0]), math.radians(rotation[1]), math.radians(rotation[2])))
    return camera_object


def setup_cameras() -> None:
    add_camera("cam_bust", (0.0, -2.8, 1.55), (82.0, 0.0, 0.0))
    add_camera("cam_full", (0.0, -4.2, 1.05), (88.0, 0.0, 0.0))
    add_camera("cam_face", (0.0, -1.35, 1.78), (90.0, 0.0, 0.0))
    add_camera("cam_front", (0.0, -3.5, 1.05), (90.0, 0.0, 0.0))
    add_camera("cam_back", (0.0, 3.5, 1.05), (90.0, 0.0, 180.0))
    add_camera("cam_frontfull", (0.8, -3.8, 1.05), (88.0, 0.0, 12.0))
    bpy.context.scene.camera = bpy.data.objects["cam_bust"]


def setup_lights() -> None:
    sun_data = bpy.data.lights.new(name="KeyLight", type="SUN")
    sun_data.energy = 2.4
    sun = bpy.data.objects.new("KeyLight", sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = Euler((math.radians(35.0), math.radians(0.0), math.radians(25.0)))
    fill_data = bpy.data.lights.new(name="FillLight", type="AREA")
    fill_data.energy = 180.0
    fill = bpy.data.objects.new("FillLight", fill_data)
    bpy.context.collection.objects.link(fill)
    fill.location = Vector((1.5, -1.5, 2.0))
    fill.rotation_euler = Euler((math.radians(65.0), math.radians(0.0), math.radians(35.0)))


def setup_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"


def main() -> None:
    clear_scene()
    material = create_skin_material()
    build_avatar(material)
    setup_cameras()
    setup_lights()
    setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUTPUT)
    print(f"[avatar-bot] blend saved to {BLEND_OUTPUT}")


if __name__ == "__main__":
    main()
