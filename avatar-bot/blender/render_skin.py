"""
Render Minecraft skin using minecraft_avatar.blend scene.
Invoked by Node via:
  blender --background scene.blend --python render_skin.py -- --skin skin.png --output out.png --pose bust --background studio --size 512
"""
import argparse
import sys
import bpy

CAMERA_BY_POSE = {
    "bust": "cam_bust",
    "full": "cam_full",
    "face": "cam_face",
    "front": "cam_front",
    "back": "cam_back",
    "frontfull": "cam_frontfull",
}

BACKGROUND_COLORS = {
    "studio": ((0.86, 0.92, 1.0), (0.94, 0.97, 1.0)),
    "sunset": ((0.98, 0.57, 0.24), (0.49, 0.23, 0.93)),
    "ocean": ((0.02, 0.71, 0.83), (0.11, 0.31, 0.85)),
    "dark": ((0.07, 0.09, 0.15), (0.22, 0.25, 0.32)),
}


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    parser = argparse.ArgumentParser()
    parser.add_argument("--skin", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--pose", default="bust")
    parser.add_argument("--background", default="studio")
    parser.add_argument("--size", type=int, default=512)
    return parser.parse_args(argv)


def apply_skin_texture(skin_path: str) -> None:
    material = bpy.data.materials.get("Skin")
    if material is None:
        raise RuntimeError("Material 'Skin' not found in blend file")
    texture_node = material.node_tree.nodes.get("SkinTexture")
    if texture_node is None:
        raise RuntimeError("Node 'SkinTexture' not found in Skin material")
    image = bpy.data.images.load(skin_path, check_existing=True)
    image.colorspace_settings.name = "sRGB"
    texture_node.image = image


def set_active_camera(pose: str) -> None:
    camera_name = CAMERA_BY_POSE.get(pose, "cam_bust")
    camera_object = bpy.data.objects.get(camera_name)
    if camera_object is None:
        raise RuntimeError(f"Camera '{camera_name}' not found in blend file")
    bpy.context.scene.camera = camera_object


def apply_background(background: str) -> None:
    scene = bpy.context.scene
    if background == "transparent":
        scene.render.film_transparent = True
        return
    scene.render.film_transparent = False
    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("AvatarWorld")
        scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputWorld")
    background_node = nodes.new("ShaderNodeBackground")
    gradient = nodes.new("ShaderNodeTexGradient")
    ramp = nodes.new("ShaderNodeValToRGB")
    mapping = nodes.new("ShaderNodeMapping")
    tex_coord = nodes.new("ShaderNodeTexCoord")
    colors = BACKGROUND_COLORS.get(background, BACKGROUND_COLORS["studio"])
    ramp.color_ramp.elements[0].color = (*colors[0], 1.0)
    ramp.color_ramp.elements[1].color = (*colors[1], 1.0)
    gradient.gradient_type = "LINEAR"
    links.new(tex_coord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], gradient.inputs["Vector"])
    links.new(gradient.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], background_node.inputs["Color"])
    background_node.inputs["Strength"].default_value = 1.0
    links.new(background_node.outputs["Background"], output.inputs["Surface"])


def render_to_file(output_path: str, size: int) -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    apply_skin_texture(args.skin)
    set_active_camera(args.pose)
    apply_background(args.background)
    render_to_file(args.output, args.size)
    print(f"[avatar-bot] render saved to {args.output}")


if __name__ == "__main__":
    main()
