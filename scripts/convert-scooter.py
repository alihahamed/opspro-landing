"""One-off: bake public/models/scooter.glb into src/data/scooter-mesh.json for deck.gl's SimpleMeshLayer.

Model: "Scooter" by Poly by Google (CC-BY), https://poly.pizza/m/eHdEFPwUfCt
Output: flat-shaded triangles in metres, facing +x, z up, colours sampled from the texture per face.
Run: python3 scripts/convert-scooter.py
"""
import io, json, struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LENGTH_M = 1.9  # real scooter length; the model is ~120 units long

buf = (ROOT / 'public/models/scooter.glb').read_bytes()
json_len = struct.unpack_from('<I', buf, 12)[0]
gltf = json.loads(buf[20:20 + json_len])
bin_start = 20 + json_len + 8


def accessor(i):
    a = gltf['accessors'][i]
    view = gltf['bufferViews'][a['bufferView']]
    size = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    fmt = {5126: 'f', 5123: 'H', 5125: 'I'}[a['componentType']]
    off = bin_start + view.get('byteOffset', 0) + a.get('byteOffset', 0)
    vals = struct.unpack_from('<' + fmt * size * a['count'], buf, off)
    return [vals[k * size:(k + 1) * size] for k in range(a['count'])]


prim = gltf['meshes'][0]['primitives'][0]
pos = accessor(prim['attributes']['POSITION'])
uv = accessor(prim['attributes']['TEXCOORD_0'])
idx = [i[0] for i in accessor(prim['indices'])]

image = gltf['images'][gltf['textures'][0]['source']]
view = gltf['bufferViews'][image['bufferView']]
start = bin_start + view.get('byteOffset', 0)
tex = Image.open(io.BytesIO(buf[start:start + view['byteLength']])).convert('RGB')

zs = [p[2] for p in pos]
scale = LENGTH_M / (max(zs) - min(zs))
# glTF is y-up with the front at +z (handlebars sit at +z). Map (x, y, z) -> (z, x, y): front → +x, up → +z.
to_ours = lambda p: (p[2] * scale, p[0] * scale, p[1] * scale)

out = {'positions': [], 'normals': [], 'colors': []}
for t in range(0, len(idx), 3):
    a, b, c = (to_ours(pos[i]) for i in idx[t:t + 3])
    u = [b[k] - a[k] for k in range(3)]
    v = [c[k] - a[k] for k in range(3)]
    n = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
    length = sum(x * x for x in n) ** 0.5 or 1
    n = tuple(x / length for x in n)
    cu = sum(uv[i][0] for i in idx[t:t + 3]) / 3  # face colour from the texture at the face centre
    cv = sum(uv[i][1] for i in idx[t:t + 3]) / 3
    px = tex.getpixel((min(tex.width - 1, int(cu % 1 * tex.width)), min(tex.height - 1, int(cv % 1 * tex.height))))
    for p in (a, b, c):
        out['positions'] += [round(x, 3) for x in p]
        out['normals'] += [round(x, 2) for x in n]
        out['colors'] += [round(ch / 255, 2) for ch in px]

(ROOT / 'src/data/scooter-mesh.json').write_text(json.dumps(out))
xs = out['positions'][0::3]; zs2 = out['positions'][2::3]
print(f"{len(idx) // 3} faces, x {min(xs):.2f}..{max(xs):.2f} m, height {max(zs2):.2f} m")
