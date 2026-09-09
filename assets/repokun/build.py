"""Build RepoKun's reusable rig, GLB and photographic studio scenes in Blender 4.5.

blender -b --python assets/repokun/build.py -- --build
blender -b --python assets/repokun/build.py -- --render launch
All geometry, materials, rigging and animation are authored here; no external add-ons.
"""
from pathlib import Path
import argparse
import math
import sys
import bpy
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parent
CATALOG_ID = "b5e628d8-d2f5-43d1-b9cf-08dd5dbd2a92"


def linear(c):
    return c / 12.92 if c < .04045 else ((c + .055) / 1.055) ** 2.4


def material(name, hex_color, roughness=.34, coat=.15, texture=False):
    color = tuple(linear(int(hex_color[i:i+2], 16) / 255) for i in (0, 2, 4))
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Coat Roughness'].default_value = .27
    if texture:
        noise = mat.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 165
        noise.inputs['Detail'].default_value = 2
        bump = mat.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .12
        bump.inputs['Distance'].default_value = .012
        mat.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        mat.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def finish(obj, name, mat, collection):
    obj.name = name
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def rounded_box(name, loc, dims, radius, mat, collection):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new('Soft molded corners', 'BEVEL')
    bevel.width = radius
    bevel.segments = 10
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    normal = obj.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
    normal.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=normal.name)
    return finish(obj, name, mat, collection)


def sphere(name, loc, scale, mat, collection):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, collection)


def soft_body(mat, collection):
    # A superellipsoid gives the shell a gentle pillow-like crown rather than
    # the planar face of a beveled cube. RepoKun itself does not sit on a pillow.
    def signed_power(v): return math.copysign(abs(v)**.42, v)
    rings, segments = 64, 128
    vertices = [(0,0,1.91-1.31)]
    for j in range(1,rings):
        v=-math.pi/2+math.pi*j/rings
        for i in range(segments):
            u=math.tau*i/segments
            vertices.append((1.82*signed_power(math.cos(v))*signed_power(math.cos(u)),
                             .61*signed_power(math.cos(v))*signed_power(math.sin(u)),
                             1.91+1.31*signed_power(math.sin(v))))
    vertices.append((0,0,1.91+1.31))
    faces=[]
    for i in range(segments): faces.append((0,1+(i+1)%segments,1+i))
    for j in range(rings-2):
        for i in range(segments):
            a=1+j*segments+i; b=1+j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    top=len(vertices)-1; start=1+(rings-2)*segments
    for i in range(segments): faces.append((start+i,start+(i+1)%segments,top))
    mesh=bpy.data.meshes.new('Rounded controller shell')
    mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new('Body',mesh)
    collection.objects.link(obj)
    return finish(obj,'Body',mat,collection)


def disk(name, x, y, z, radius, depth, mat, collection):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=depth,
                                      location=(x, y, z), rotation=(math.pi/2, 0, 0))
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bevel = obj.modifiers.new('Soft button rim', 'BEVEL')
    bevel.width = .045
    bevel.segments = 5
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    normal = obj.modifiers.new('Button normals', 'WEIGHTED_NORMAL')
    bpy.ops.object.modifier_apply(modifier=normal.name)
    return finish(obj, name, mat, collection)


def extruded_outline(name, outline, x, y, z, depth, mat, collection, bevel=.02):
    n = len(outline)
    vertices = [(x+px, y+dy, z+pz) for dy in (-depth/2, depth/2) for px, pz in outline]
    faces = [tuple(range(n-1, -1, -1)), tuple(range(n, 2*n))]
    faces += [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mod = obj.modifiers.new('Rounded silhouette edge', 'BEVEL')
    mod.width = bevel
    mod.segments = 4
    bpy.ops.object.modifier_apply(modifier=mod.name)
    normal = obj.modifiers.new('Surface normals', 'WEIGHTED_NORMAL')
    bpy.ops.object.modifier_apply(modifier=normal.name)
    obj.select_set(False)
    return finish(obj, name, mat, collection)


def smile_outline():
    # A small U-shaped open smile, with rounded corners and a dipped upper lip.
    points = []
    curves = [((-.32,.12),(-.25,.22),(-.25,-.02),(0,-.015)),
              ((0,-.015),(.25,-.02),(.25,.22),(.32,.12)),
              ((.32,.12),(.48,-.30),(-.48,-.30),(-.32,.12))]
    for a,b,c,d in curves:
        for i in range(24):
            t=i/24
            points.append(tuple((1-t)**3*a[j]+3*(1-t)**2*t*b[j]+3*(1-t)*t*t*c[j]+t**3*d[j] for j in (0,1)))
    return points


def bind(obj, rig, bone):
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    mod = obj.modifiers.new('RepoKun rig', 'ARMATURE')
    mod.object = rig
    obj.parent = rig


def pose_rotation(rig, name, angle, axis=(0,1,0)):
    bone = rig.pose.bones[name]
    rest = rig.data.bones[name].matrix_local.to_quaternion()
    bone.rotation_mode = 'QUATERNION'
    bone.rotation_quaternion = rest.inverted() @ Quaternion(axis, math.radians(angle)) @ rest


def reset_pose(rig):
    for bone in rig.pose.bones:
        bone.location = (0,0,0)
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = (1,0,0,0)
        bone.scale = (1,1,1)


def animate(rig):
    rig.animation_data_create()
    for name, end in [('Idle', 96), ('Wave', 72), ('Hop', 48)]:
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        rig.animation_data.action = action
        for frame in range(1, end+1):
            reset_pose(rig)
            t = (frame-1)/(end-1)
            if name == 'Idle':
                rig.pose.bones['body'].location.y = .018*math.sin(t*math.tau)
                pose_rotation(rig, 'arm.L', 3*math.sin(t*math.tau))
                pose_rotation(rig, 'arm.R', -3*math.sin(t*math.tau))
            elif name == 'Wave':
                ease = min(1, t/.22, (1-t)/.22)
                ease = ease*ease*(3-2*ease)
                pose_rotation(rig, 'arm.L', -ease*(125+13*math.sin(t*math.tau*3)))
                pose_rotation(rig, 'body', -3*ease)
            else:
                jump = max(0, math.sin(math.pi*min(1,max(0,(t-.15)/.7))))
                rig.pose.bones['root'].location.y = .62*jump
                pose_rotation(rig, 'arm.L', -24*jump)
                pose_rotation(rig, 'arm.R', 24*jump)
            for bone in rig.pose.bones:
                for prop in ('location','rotation_quaternion','scale'):
                    bone.keyframe_insert(data_path=prop, frame=frame, group=bone.name)
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        track.mute = True
    rig.animation_data.action = None
    reset_pose(rig)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    collection = bpy.data.collections.new('RepoKun')
    bpy.context.scene.collection.children.link(collection)
    cream = material('RepoKun • warm ivory', 'F6E8D7', .3, .18, True)
    black = material('RepoKun • charcoal', '1E1E1E', .28, .22)
    red = material('RepoKun • vermilion', 'CA2413', .28, .25)
    rim = material('RepoKun • button socket', '692017', .3, .1)
    blush = material('RepoKun • peach cheeks', 'F4A08C', .48, .05)
    mouthmat = material('RepoKun • mouth', '100E0C', .6, 0)
    tongue = material('RepoKun • tongue', 'ED735A', .45, 0)
    bindings = []
    body = soft_body(cream, collection)
    bindings.append((body,'body'))
    # Front is -Y; D-pad is viewer-left, red buttons viewer-right, per the reference.
    w=.17; a=.46
    cross=[(-w,a),(w,a),(w,w),(a,w),(a,-w),(w,-w),(w,-a),(-w,-a),(-w,-w),(-a,-w),(-a,w),(-w,w)]
    dpad=extruded_outline('Face.D-pad', cross, -1.0,-.68,2.13,.16,black,collection,.05)
    bindings.append((dpad,'body'))
    for name,x,z,r in [('A',1.05,2.43,.275),('B',.64,1.97,.235)]:
        bindings.append((disk('Face.'+name+'.socket',x,-.64,z,r+.028,.065,rim,collection),'body'))
        bindings.append((disk('Face.'+name,x,-.716,z,r,.13,red,collection),'body'))
    for x,side in [(-1.02,'R'),(1.07,'L')]:
        cheek=[]
        for cx,cz,start in [(.105,.015,0),(-.105,.015,90),(-.105,-.015,180),(.105,-.015,270)]:
            for i in range(13):
                t=math.radians(start+i*90/12)
                cheek.append((cx+.12*math.cos(t),cz+.12*math.sin(t)))
        bindings.append((extruded_outline('Face.cheek.'+side,cheek,x,-.617,1.49,.028,blush,collection,.009),'body'))
    bindings.append((extruded_outline('Face.smile',smile_outline(),0,-.64,1.58,.045,mouthmat,collection,.014),'body'))
    bindings.append((sphere('Face.tongue',(0,-.681,1.437),(.12,.018,.035),tongue,collection),'body'))
    for sign,side in [(1,'L'),(-1,'R')]:
        arm=sphere('Arm.'+side,(sign*1.76,.01,1.25),(.265,.305,.48),cream,collection)
        arm.rotation_euler.y = math.radians(-sign*13)
        bindings.append((arm,'arm.'+side))
        foot=sphere('Foot.'+side,(sign*.98,-.04,.37),(.31,.395,.37),cream,collection)
        bindings.append((foot,'leg.'+side))
    armature = bpy.data.armatures.new('RepoKun skeleton')
    rig = bpy.data.objects.new('RepoKun.Rig',armature)
    collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bones=[('root',(0,0,0),(0,0,.4),None),
           ('body',(0,0,.7),(0,0,2.0),'root'),
           ('arm.L',(1.60,0,1.65),(1.85,0,1.0),'body'),
           ('arm.R',(-1.60,0,1.65),(-1.85,0,1.0),'body'),
           ('leg.L',(.98,0,.65),(.98,0,.12),'root'),
           ('leg.R',(-.98,0,.65),(-.98,0,.12),'root')]
    for name,head,tail,parent in bones:
        bone=armature.edit_bones.new(name)
        bone.head=head; bone.tail=tail
        if parent: bone.parent=armature.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.show_in_front=True
    armature.display_type='STICK'
    rig['usage']='Pose bones or select Idle / Wave / Hop actions. Front -Y. Z up. Ground z=0.'
    rig['anatomy']='One body, two arms, two feet. L/R are the character’s own sides.'
    for obj,bone in bindings: bind(obj,rig,bone)
    animate(rig)
    collection.asset_mark()
    collection.asset_data.description='RepoKun: rigged warm-ivory controller mascot, Idle / Wave / Hop.'
    collection.asset_data.author='Shokunin / Retro Porting Toolkit'
    collection.asset_data.catalog_id=CATALOG_ID
    bpy.context.scene.render.fps=24
    bpy.context.scene.frame_end=96
    bpy.context.scene.frame_set(1)
    bpy.context.scene.unit_settings.system='METRIC'
    # No stage or lights in the character library; append/link the whole collection.
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'model'/'repokun.blend'),compress=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.all_objects: obj.select_set(True)
    for track in rig.animation_data.nla_tracks: track.mute=False
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'model'/'repokun.glb'),export_format='GLB',
        use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',
        export_force_sampling=True,export_skins=True,export_extras=True)
    print('REPOKUN: model library and animated GLB built',flush=True)


def append_character(name='RepoKun', location=(0,0,0), action=None):
    """Add an independent, poseable RepoKun to the current scene without clearing it."""
    with bpy.data.libraries.load(str(ROOT/'model'/'repokun.blend'),link=False) as (src,dst):
        dst.collections=['RepoKun']
    collection=dst.collections[0]
    collection.name=name
    bpy.context.scene.collection.children.link(collection)
    rig=next(obj for obj in collection.all_objects if obj.type=='ARMATURE')
    rig.name=name+'.Rig'
    rig.location=location
    if action:
        track=next(t for t in rig.animation_data.nla_tracks if t.name==action)
        rig.animation_data.action=track.strips[0].action
    return rig


def aim(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def light(name, loc, energy, size, color, target):
    data=bpy.data.lights.new(name,'AREA')
    data.energy=energy; data.shape='DISK'; data.size=size; data.color=color
    obj=bpy.data.objects.new(name,data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location=loc; aim(obj,target)


def scene_setup(view, preview=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig=append_character()
    scene=bpy.context.scene
    studio=bpy.data.collections.new('Studio')
    scene.collection.children.link(studio)
    floor=material('Studio • sand', 'D5AF89', .63, 0)
    ground=rounded_box('Studio.floor',(0,0,-.15),(200,200,.3),.1,floor,studio)
    # A broad, uninterrupted floor gives a seamless backdrop and soft contact shadow.
    scene.world=bpy.data.worlds.new('Studio ambient')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.55,.65,.8,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.24
    light('Key • large softbox',(-4,-4,7),650,5.0,(1,.87,.73),(0,0,1.5))
    light('Fill • window',(4,-2,4),350,4,(.84,.91,1),(0,0,1.6))
    light('Rim • warm',(1,4,6),850,3,(1,.77,.53),(0,0,1.6))
    camera_data=bpy.data.cameras.new('Camera')
    camera=bpy.data.objects.new('Camera',camera_data)
    scene.collection.objects.link(camera)
    scene.camera=camera
    camera_data.type='ORTHO'; camera_data.lens=65
    if view=='launch':
        # Room for a headline at image-left; camera sees the full wave and both feet.
        rig.location.x=1.45
        rig.rotation_euler.z=math.radians(-9)
        pose_rotation(rig,'arm.L',-125)
        pose_rotation(rig,'arm.R',12)
        pose_rotation(rig,'body',-3)
        camera.location=(4,-13,6.3); aim(camera,(.25,0,1.72)); camera_data.ortho_scale=9.2
        coral=material('Launch • coral','DC5B3D',.38,.15)
        gold=material('Launch • gold','EDB950',.4,.1)
        # Small four-point stars are launch accents, not extra character anatomy.
        star=[(0,.28),(.075,.075),(.28,0),(.075,-.075),(0,-.28),(-.075,-.075),(-.28,0),(-.075,.075)]
        for i,(x,y,z,s,mat) in enumerate([(3.8,.7,3.7,.7,gold),(-.2,.8,3.8,.45,coral),(3.6,.5,1.5,.4,gold)]):
            obj=extruded_outline('Launch.sparkle.'+str(i),[(a*s,b*s) for a,b in star],x,y,z,.055,mat,studio,.015)
            obj.rotation_euler.z=math.radians(8)
    else:
        positions={'front':(0,-12,4.4),'three-quarter':(5,-12,5.0),'back':(5,12,4.6),'transparent':(4,-12,4.8)}
        camera.location=positions[view]; aim(camera,(0,0,1.62)); camera_data.ortho_scale=6.3
        if view=='transparent':
            ground.hide_render=True
            scene.render.film_transparent=True
    scene.render.engine='CYCLES'
    scene.cycles.samples=24 if preview else 96
    scene.cycles.use_denoising=True
    scene.cycles.max_bounces=8
    scene.render.resolution_x=2000
    scene.render.resolution_y=1334
    scene.render.resolution_percentage=45 if preview else 100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA' if view=='transparent' else 'RGB'
    scene.render.image_settings.color_depth='8'
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.render.fps=24
    scene.frame_end=96
    scene.render.filepath=str(ROOT/'renders'/('_preview-'+view+'.png' if preview else 'repokun-'+view+'.png'))
    # Lighting and poses are deliberately separate from the neutral model library.
    if not preview:
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'scenes'/('repokun-'+view+'.blend')),compress=True)
    bpy.ops.render.render(write_still=True)
    print('REPOKUN: rendered '+view,flush=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--build',action='store_true')
    parser.add_argument('--render',choices=['launch','front','three-quarter','back','transparent','all'])
    parser.add_argument('--preview',action='store_true')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for folder in ('model','scenes','renders'): (ROOT/folder).mkdir(parents=True,exist_ok=True)
    if args.build: build()
    if args.render:
        for view in (['launch','front','three-quarter','back','transparent'] if args.render=='all' else [args.render]):
            scene_setup(view,args.preview)


if __name__=='__main__': main()
