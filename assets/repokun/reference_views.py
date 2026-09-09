"""Render a consistent reference turnaround from the approved model, unchanged.

blender -b --python-exit-code 1 --python assets/repokun/reference_views.py
"""
from pathlib import Path
import importlib.util
import hashlib
import math
import sys
import bpy
from mathutils import Matrix, Vector

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'references'/'model-views'
spec=importlib.util.spec_from_file_location('repokun',ROOT/'build.py')
model=importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)

OUT.mkdir(parents=True,exist_ok=True)
model_hash=hashlib.sha256((ROOT/'model'/'repokun.glb').read_bytes()).hexdigest()
stamp=OUT/'model-source.sha256'
if '--view' in sys.argv:
    assert stamp.exists() and stamp.read_text().strip()==model_hash, 'Model changed: regenerate the complete reference set'
for name,position,action,frame in [
    ('front',(0,-12,1.61),None,1),
    ('three-quarter',(9,-12,1.61),None,1),
    ('left-profile',(12,0,1.61),None,1),
    ('back',(0,12,1.61),None,1),
    ('wave',(0,-12,1.61),'Wave',30),
    ('hop',(0,-12,1.61),'Hop',18),
]:
    if '--view' in sys.argv and name!=sys.argv[sys.argv.index('--view')+1]: continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig=model.append_character(action=action)
    scene=bpy.context.scene
    scene.frame_set(frame)
    # Rotate the light positions with the viewing direction, preserving the
    # same neutral material readability on every side of the model.
    direction=Vector(position)
    angle=math.atan2(direction.x,-direction.y)
    rotation=Matrix.Rotation(angle,4,'Z')
    for label,loc,energy,size,color in [
        ('Key',(-4,-6,7),800,5,(1,.94,.87)),
        ('Fill',(4,-3,4),500,4,(.91,.95,1)),
        ('Rim',(1,4,6),700,3,(1,.88,.75)),
    ]:
        model.light(label,rotation @ Vector(loc),energy,size,color,(0,0,1.6))
    scene.world=bpy.data.worlds.new('Neutral reference ambient')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(1,1,1,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25
    camera=bpy.data.objects.new('Reference camera',bpy.data.cameras.new('Reference camera'))
    scene.collection.objects.link(camera)
    scene.camera=camera
    camera.location=position
    model.aim(camera,(0,0,1.61))
    camera.data.type='ORTHO'
    camera.data.ortho_scale=6.5
    scene.render.engine='CYCLES'
    scene.cycles.samples=32
    scene.cycles.use_denoising=True
    scene.render.film_transparent=True
    scene.render.resolution_x=2000
    scene.render.resolution_y=1334
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    print('REFERENCE VIEW: '+name,flush=True)
stamp.write_text(model_hash+'\n')
