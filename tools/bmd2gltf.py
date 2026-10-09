"""Convertit un modèle Pixelmon (.bmd = SMD Valve binaire, XZ optionnel) + ses animations en .glb.

Usage : python bmd2gltf.py <dossier_espece> <sortie.glb> [--fps 24]
Le dossier contient <nom>.bmd (maillage), idle.bmd / walk.bmd / ... (animations), texture.png, emissive.png.
"""
import struct, lzma, json, math, os, sys, glob
import numpy as np

# ---------- lecture .bmd ----------
class R:
    def __init__(s, d): s.d = d; s.p = 0
    def rd(s, fmt):
        v = struct.unpack_from(fmt, s.d, s.p); s.p += struct.calcsize(fmt); return v
    def rs(s):
        e = s.p
        while s.d[e:e + 2] != b'\x00\x00':
            e += 2
            if e >= len(s.d) or e - s.p > 512: raise ValueError('chaine invalide')
        v = s.d[s.p:e].decode('utf-16-be'); s.p = e + 2; return v

def load_bmd(fn):
    b = open(fn, 'rb').read()
    raw = lzma.LZMADecompressor().decompress(b[1:]) if b[0] == 2 else b[1:]
    # le compteur d'images vaut parfois "dernier index" (animations) : on essaie nf puis nf+1
    for extra in (0, 1):
        try:
            return _parse(raw, extra)
        except (AssertionError, ValueError, struct.error, UnicodeDecodeError):
            pass
    raise ValueError(f'format non reconnu : {fn}')

def _parse(raw, extra):
    r = R(raw)
    n, = r.rd('>H'); nodes = []
    for _ in range(n):
        idx, par = r.rd('>hh'); nodes.append((idx, par, r.rs()))
    nf, = r.rd('>H'); frames = []
    for _ in range(nf + extra):
        nb, = r.rd('>H'); fr = {}
        for _ in range(nb):
            v = r.rd('>h6f'); fr[v[0]] = v[1:]
        frames.append(fr)
    tris = []  # (index_materiau, [3 x (pos, nrm, uv, links)])
    nm, = r.rd('>H')
    assert nm < 64
    mats = [r.rs() for _ in range(nm)]
    if nm:
        nt, = r.rd('>H')
        for _ in range(nt):
            mi, = r.rd('>B')  # index du matériau
            assert mi < nm
            vs = []
            for _ in range(3):
                pb, = r.rd('>h'); f = r.rd('>8f'); nl, = r.rd('>B')
                assert nl <= 16
                links = [r.rd('>hf') for _ in range(nl)] or [(pb, 1.0)]
                vs.append((f[0:3], f[3:6], f[6:8], links))
            tris.append((mi, vs))
    assert r.p == len(raw)
    return nodes, frames, tris

# ---------- maths ----------
def euler_to_quat(x, y, z):
    # SMD/Source : R = Rz * Ry * Rx
    cx, sx = math.cos(x / 2), math.sin(x / 2)
    cy, sy = math.cos(y / 2), math.sin(y / 2)
    cz, sz = math.cos(z / 2), math.sin(z / 2)
    return (sx * cy * cz - cx * sy * sz,  # x
            cx * sy * cz + sx * cy * sz,  # y
            cx * cy * sz - sx * sy * cz,  # z
            cx * cy * cz + sx * sy * sz)  # w

def trs_matrix(t, q):
    x, y, z, w = q
    m = np.eye(4)
    m[:3, :3] = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                 [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                 [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
    m[:3, 3] = t
    return m

# ---------- construction glb ----------
class Glb:
    def __init__(s):
        s.bin = bytearray(); s.g = {'asset': {'version': '2.0', 'generator': 'bmd2gltf'},
                                    'bufferViews': [], 'accessors': []}
    def view(s, data, target=None):
        while len(s.bin) % 4: s.bin += b'\0'
        bv = {'buffer': 0, 'byteOffset': len(s.bin), 'byteLength': len(data)}
        if target: bv['target'] = target
        s.bin += data; s.g['bufferViews'].append(bv); return len(s.g['bufferViews']) - 1
    def acc(s, arr, ctype, typ, target=None, minmax=False):
        arr = np.ascontiguousarray(arr)
        a = {'bufferView': s.view(arr.tobytes(), target), 'componentType': ctype,
             'count': int(arr.shape[0]), 'type': typ}
        if minmax:
            a['min'] = arr.min(0).reshape(-1).tolist(); a['max'] = arr.max(0).reshape(-1).tolist()
        s.g['accessors'].append(a); return len(s.g['accessors']) - 1
    def write(s, fn):
        while len(s.bin) % 4: s.bin += b'\0'
        s.g['buffers'] = [{'byteLength': len(s.bin)}]
        js = json.dumps(s.g, separators=(',', ':')).encode()
        while len(js) % 4: js += b' '
        out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(s.bin))
        out += struct.pack('<II', len(js), 0x4E4F534A) + js
        out += struct.pack('<II', len(s.bin), 0x004E4942) + bytes(s.bin)
        open(fn, 'wb').write(out)

FLOAT, USHORT, UBYTE, UINT = 5126, 5123, 5121, 5125

def convert(folder, out, fps=24.0):
    folder = folder.rstrip('/')
    bmds = glob.glob(os.path.join(folder, '*.bmd'))
    mesh_file = None; anims = {}
    for f in bmds:
        nodes, frames, tris = load_bmd(f)
        if tris: mesh_file = (f, nodes, frames, tris)
        else: anims[os.path.splitext(os.path.basename(f))[0]] = (nodes, frames)
    assert mesh_file, 'aucun maillage'
    _, nodes, frames, tris = mesh_file
    ids = [n[0] for n in nodes]; assert ids == list(range(len(nodes)))
    parents = [n[1] for n in nodes]; names = [n[2] for n in nodes]
    bind = frames[0]

    # pose de repos : matrices monde
    local_t, local_q, world = [], [], []
    for i in range(len(nodes)):
        v = bind.get(i, (0, 0, 0, 0, 0, 0))
        t, q = v[:3], euler_to_quat(*v[3:])
        local_t.append(t); local_q.append(q)
        m = trs_matrix(t, q)
        world.append(world[parents[i]] @ m if parents[i] >= 0 else m)
    ibm = np.array([np.linalg.inv(w).T for w in world], dtype='<f4')  # column-major

    # sommets dédupliqués
    vmap, P, N, UV, J, W, idx = {}, [], [], [], [], [], []
    for _, vs in tris:
        for pos, nrm, uv, links in vs:
            links = sorted(links, key=lambda l: -l[1])[:4]
            tot = sum(l[1] for l in links) or 1.0
            jj = [l[0] for l in links] + [0] * (4 - len(links))
            ww = [l[1] / tot for l in links] + [0.0] * (4 - len(links))
            key = (pos, nrm, uv, tuple(jj), tuple(round(w, 5) for w in ww))
            k = vmap.get(key)
            if k is None:
                k = vmap[key] = len(P)
                P.append(pos); N.append(nrm); UV.append((uv[0], 1.0 - uv[1])); J.append(jj); W.append(ww)
            idx.append(k)
    P = np.array(P, '<f4'); N = np.array(N, '<f4')
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-8)

    g = Glb()
    attrs = {'POSITION': g.acc(P, FLOAT, 'VEC3', 34962, True),
             'NORMAL': g.acc(N, FLOAT, 'VEC3', 34962),
             'TEXCOORD_0': g.acc(np.array(UV, '<f4'), FLOAT, 'VEC2', 34962),
             'JOINTS_0': g.acc(np.array(J, '<u2'), USHORT, 'VEC4', 34962),
             'WEIGHTS_0': g.acc(np.array(W, '<f4'), FLOAT, 'VEC4', 34962)}
    ind = g.acc(np.array(idx, '<u4'), UINT, 'SCALAR', 34963)

    # textures
    mat = {'name': 'pokemon', 'pbrMetallicRoughness': {'metallicFactor': 0.0, 'roughnessFactor': 1.0},
           'alphaMode': 'MASK', 'alphaCutoff': 0.5, 'doubleSided': True}
    g.g['images'] = []; g.g['textures'] = []
    g.g['samplers'] = [{'magFilter': 9728, 'minFilter': 9728}]  # NEAREST, pixel art
    def add_tex(fn):
        g.g['images'].append({'bufferView': g.view(open(fn, 'rb').read()), 'mimeType': 'image/png'})
        g.g['textures'].append({'sampler': 0, 'source': len(g.g['images']) - 1})
        return len(g.g['textures']) - 1
    tex = os.path.join(folder, 'texture.png')
    if os.path.exists(tex): mat['pbrMetallicRoughness']['baseColorTexture'] = {'index': add_tex(tex)}
    em = os.path.join(folder, 'emissive.png')
    if os.path.exists(em):
        mat['emissiveTexture'] = {'index': add_tex(em)}; mat['emissiveFactor'] = [1, 1, 1]

    g.g['materials'] = [mat]
    g.g['meshes'] = [{'name': 'body', 'primitives': [{'attributes': attrs, 'indices': ind, 'material': 0}]}]

    # noeuds : 0..n-1 = os, n = maillage, n+1 = racine de scène
    gn = []
    for i in range(len(nodes)):
        node = {'name': names[i], 'translation': list(local_t[i]), 'rotation': list(local_q[i])}
        kids = [c for c in range(len(nodes)) if parents[c] == i]
        if kids: node['children'] = kids
        gn.append(node)
    n = len(nodes)
    gn.append({'name': 'mesh', 'mesh': 0, 'skin': 0})
    roots = [i for i in range(n) if parents[i] < 0]
    # Blender (Z en haut) -> glTF (Y en haut) : -90° autour de X
    gn.append({'name': os.path.basename(folder), 'children': roots + [n],
               'rotation': [-math.sqrt(0.5), 0.0, 0.0, math.sqrt(0.5)]})
    g.g['nodes'] = gn
    g.g['skins'] = [{'joints': list(range(n)), 'inverseBindMatrices': g.acc(ibm.reshape(n, 16), FLOAT, 'MAT4')}]
    g.g['scenes'] = [{'nodes': [n + 1]}]; g.g['scene'] = 0

    # animations (os associés par nom ; images clairsemées = on garde la valeur précédente)
    g.g['animations'] = []
    for aname, (anodes, aframes) in sorted(anims.items()):
        amap = {a[0]: names.index(a[2]) for a in anodes if a[2] in names}
        nfr = len(aframes)
        times = np.arange(nfr, dtype='<f4') / fps
        tacc = g.acc(times.reshape(-1, 1), FLOAT, 'SCALAR', minmax=True)
        chans, samps = [], []
        for ai, mi in amap.items():
            cur = bind.get(mi, (0, 0, 0, 0, 0, 0)); T, Q = [], []
            for fr in aframes:
                if ai in fr: cur = fr[ai]
                T.append(cur[:3]); Q.append(euler_to_quat(*cur[3:]))
            Q = np.array(Q)
            for k in range(1, len(Q)):  # continuité des quaternions
                if np.dot(Q[k], Q[k - 1]) < 0: Q[k] = -Q[k]
            for path, arr, typ in (('translation', np.array(T, '<f4'), 'VEC3'), ('rotation', Q.astype('<f4'), 'VEC4')):
                samps.append({'input': tacc, 'output': g.acc(arr, FLOAT, typ), 'interpolation': 'LINEAR'})
                chans.append({'sampler': len(samps) - 1, 'target': {'node': mi, 'path': path}})
        g.g['animations'].append({'name': aname, 'channels': chans, 'samplers': samps})

    g.write(out)
    return {'bones': n, 'verts': len(P), 'tris': len(tris), 'anims': {k: len(v[1]) for k, v in anims.items()},
            'kb': os.path.getsize(out) // 1024}

if __name__ == '__main__':
    fps = 24.0
    if '--fps' in sys.argv:
        i = sys.argv.index('--fps'); fps = float(sys.argv[i + 1]); del sys.argv[i:i + 2]
    print(convert(sys.argv[1], sys.argv[2], fps))
