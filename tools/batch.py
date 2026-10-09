"""Convertit tous les dossiers Pixelmon contenant un .bmd en .glb.

Usage : python batch.py <assets/pixelmon/textures/pokemon> <dossier_sortie> [--resume]
"""
import sys, os, glob, json
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bmd2gltf as C


def job(args):
    d, root, outdir, resume = args
    rel = os.path.relpath(d, root).replace('\\', '/')
    out = os.path.join(outdir, rel.replace('/', '__') + '.glb')
    if resume and os.path.exists(out):
        return ('ok', rel, {'cached': True})
    try:
        return ('ok', rel, C.convert(d, out))
    except AssertionError:
        return ('nomesh', rel, None)
    except Exception as e:
        return ('fail', rel, repr(e)[:160])


def main():
    root, outdir = sys.argv[1], sys.argv[2]
    resume = '--resume' in sys.argv
    os.makedirs(outdir, exist_ok=True)
    dirs = sorted({os.path.dirname(f) for f in glob.glob(os.path.join(root, '**', '*.bmd'), recursive=True)})
    res = {'ok': [], 'fail': [], 'nomesh': []}
    with Pool(os.cpu_count()) as pool:
        for i, (st, rel, info) in enumerate(pool.imap_unordered(job, [(d, root, outdir, resume) for d in dirs], chunksize=4)):
            res[st].append((rel, info))
            if i % 100 == 0: print(f'{i}/{len(dirs)}', flush=True)
    print('dossiers', len(dirs), 'ok', len(res['ok']), 'sans maillage', len(res['nomesh']), 'echecs', len(res['fail']))
    for f in res['fail'][:20]: print('ECHEC', f)
    json.dump(res, open(os.path.join(outdir, '_rapport.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
