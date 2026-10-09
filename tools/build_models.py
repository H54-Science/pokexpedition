"""Construit models/ à partir du jar Pixelmon extrait.

Pour chaque espèce de tools/sources.json :
  1. .bmd -> .glb brut (bmd2gltf.py)
  2. compression (gltf-transform : meshopt + textures WebP, sans simplification)
  3. texture chromatique éventuelle -> models/shiny/<espece>.webp

Prérequis : python + numpy + pillow, node (npx télécharge @gltf-transform/cli au premier lancement).
Usage : python tools/build_models.py <jar_extrait>/assets/pixelmon/textures/pokemon [ESPECE ...]
"""
import json, os, subprocess, sys, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bmd2gltf as C
from PIL import Image

GT = os.environ.get('GLTF_TRANSFORM', 'npx -y @gltf-transform/cli@4.1.1').split()
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'models')


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, shell=(os.name == 'nt'))


def build(src_root, key, rel, tmp):
    folder = os.path.join(src_root, rel)
    raw = os.path.join(tmp, key + '.glb')
    info = C.convert(folder, raw)
    dst = os.path.join(OUT, key.lower() + '.glb')
    run(GT + ['optimize', raw, dst, '--compress', 'meshopt', '--texture-compress', 'webp', '--simplify', 'false'])
    shiny = os.path.join(os.path.dirname(folder), 'shiny', 'texture.png')
    if os.path.exists(shiny):
        os.makedirs(os.path.join(OUT, 'shiny'), exist_ok=True)
        Image.open(shiny).save(os.path.join(OUT, 'shiny', key.lower() + '.webp'), 'WEBP', quality=90, method=6)
    out = {'anims': sorted(info['anims']), 'kb': os.path.getsize(dst) // 1024, 'shiny': os.path.exists(shiny)}
    # taille réelle (en blocs Minecraft) depuis data/pixelmon/species/<dossier>.json
    sp = os.path.join(src_root, '..', '..', '..', '..', 'data', 'pixelmon', 'species', rel.split('/')[0] + '.json')
    if os.path.exists(sp):
        out['h'] = json.load(open(sp, encoding='utf-8'))['forms'][0]['dimensions']['height']
    return out


def main():
    src_root = sys.argv[1]
    only = {a.upper() for a in sys.argv[2:]}
    sources = json.load(open(os.path.join(HERE, 'sources.json')))
    os.makedirs(OUT, exist_ok=True)
    idx_path = os.path.join(OUT, 'index.json')
    index = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
    tmp = tempfile.mkdtemp()
    try:
        for key, rel in sources.items():
            if only and key not in only: continue
            try:
                index[key.lower()] = build(src_root, key, rel, tmp)
                print('ok ', key, index[key.lower()])
            except Exception as e:
                print('ERR', key, e)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    json.dump(dict(sorted(index.items())), open(idx_path, 'w'), indent=1)


if __name__ == '__main__':
    main()
