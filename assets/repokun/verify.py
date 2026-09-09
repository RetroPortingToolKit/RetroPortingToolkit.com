"""Validate the delivered Blender/GLB asset, clips, reuse, and exact render sizes.

blender -b --python assets/repokun/verify.py
"""
from pathlib import Path
import importlib.util
import json
import math
import struct
import sys
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('repokun_builder',ROOT/'build.py')
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

bpy.ops.wm.open_mainfile(filepath=str(ROOT/'model'/'repokun.blend'))
rig=bpy.data.objects['RepoKun.Rig']
assert set(rig.data.bones.keys())=={'root','body','arm.L','arm.R','leg.L','leg.R'}
parts=[obj for obj in bpy.data.collections['RepoKun'].all_objects if obj.type=='MESH']
assert len([o for o in parts if o.name.startswith('Arm.')])==2
assert len([o for o in parts if o.name.startswith('Foot.')])==2
assert len([o for o in parts if o.name=='Body'])==1
assert all(any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers) for o in parts)
for part in parts:
    assert all(math.isfinite(c) for v in part.data.vertices for c in v.co)
limbs=[o for o in parts if o.name.startswith(('Arm.','Foot.'))]
for part in limbs:
    root=Vector(part['joint_root'])
    # The proximal ring has a full-width attachment, not an ellipsoid's tip.
    assert part['joint_width']>=.29
    assert min((v.co-root).length for v in list(part.data.vertices)[:64])>=.285
tracks={t.name:t for t in rig.animation_data.nla_tracks}
assert set(tracks)=={'Idle','Wave','Hop'}
for name,track in tracks.items():
    rig.animation_data.action=track.strips[0].action
    bpy.context.scene.frame_set(1)
    first={b.name:b.matrix.copy() for b in rig.pose.bones}
    bpy.context.scene.frame_set(24)
    assert any(first[b.name]!=b.matrix for b in rig.pose.bones), name+' does not move'
    for frame in (1,24,48,72):
        bpy.context.scene.frame_set(frame)
        depsgraph=bpy.context.evaluated_depsgraph_get()
        body_transform=rig.matrix_world @ rig.pose.bones['body'].matrix @ rig.data.bones['body'].matrix_local.inverted()
        for part in limbs:
            evaluated=part.evaluated_get(depsgraph)
            for vertex in list(evaluated.data.vertices)[:64]:
                p=body_transform.inverted() @ (evaluated.matrix_world @ vertex.co)
                inside=(abs(p.x)/1.82)**(2/.42)+(abs(p.y)/.61)**(2/.42)+(abs(p.z-1.91)/1.31)**(2/.42)
                assert inside<1, f'{name} frame {frame}: {part.name} attachment protrudes from shell'
rig.animation_data.action=None

# Check every floating-point accessor in the actual GLB, including skin matrices.
blob=(ROOT/'model'/'repokun.glb').read_bytes()
magic,version,length=struct.unpack_from('<III',blob)
assert magic==0x46546C67 and version==2 and length==len(blob)
json_size=struct.unpack_from('<I',blob,12)[0]
gltf=json.loads(blob[20:20+json_size])
binary=memoryview(blob)[28+json_size:]
widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
for accessor in gltf['accessors']:
    if accessor['componentType']!=5126: continue
    view=gltf['bufferViews'][accessor['bufferView']]
    width=widths[accessor['type']]
    offset=view.get('byteOffset',0)+accessor.get('byteOffset',0)
    stride=view.get('byteStride',width*4)
    for i in range(accessor['count']):
        values=struct.unpack_from('<'+'f'*width,binary,offset+i*stride)
        assert all(math.isfinite(v) for v in values), 'Non-finite GLB coordinates'
assert {a['name'] for a in gltf['animations']}=={'Idle','Wave','Hop'}
assert len(gltf['skins'])==1 and len(gltf['skins'][0]['joints'])==6

# Re-import the exported artifact; confirm actual animated skin survives round-trip.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'model'/'repokun.glb'))
imported=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
assert len(imported)==1
assert len(imported[0].data.bones)==6
assert {t.name for t in imported[0].animation_data.nla_tracks}=={'Idle','Wave','Hop'}

# The convenience loader must preserve existing objects and independent rigs.
bpy.ops.wm.read_factory_settings(use_empty=True)
one=builder.append_character('First',(-3,0,0),'Wave')
two=builder.append_character('Second',(3,0,0),'Idle')
assert one!=two and one.data!=two.data
assert one.location.x==-3 and two.location.x==3
assert one.animation_data.action!=two.animation_data.action
assert len([o for o in bpy.context.scene.objects if o.type=='ARMATURE'])==2

views=() if '--model-only' in sys.argv else ('launch','front','three-quarter','back','transparent')
for view in views:
    path=ROOT/'renders'/('repokun-'+view+'.png')
    header=path.read_bytes()[:33]
    assert header[:8]==b'\x89PNG\r\n\x1a\n'
    assert struct.unpack_from('>II',header,16)==(2000,1334), path
    if view=='transparent': assert header[25]==6, 'Cutout must have an alpha channel'
    assert (ROOT/'scenes'/('repokun-'+view+'.blend')).exists()
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'scenes'/('repokun-'+view+'.blend')))
    # Scene snapshots must use the revised geometry, not stale embedded models.
    for side in ('L','R'):
        assert bpy.data.objects['Arm.'+side]['joint_width']>=.29
        assert bpy.data.objects['Foot.'+side]['joint_width']>=.29
    if view in ('launch','front'):
        camera=bpy.context.scene.camera
        forward=camera.rotation_euler.to_matrix() @ Vector((0,0,-1))
        assert abs(forward.x)<1e-5 and abs(forward.z)<1e-5, 'Camera must face level and straight on'
print(f'REPOKUN VERIFIED: geometry, 6-bone skin, 3 moving clips, GLB round-trip, independent reuse, {len(views)} exact-size renders.',flush=True)
