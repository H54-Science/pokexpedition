import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../src/meta/index.js';
import { SPECIES } from '../src/data/data.js';
import { ARENAS, arenaProfile } from '../src/render/arenas.js';
assert.deepEqual(M.contentErrors(), []);
for (const [k,s] of Object.entries(SPECIES).filter(([,s])=>s.tier===4)) {
  assert.equal(M.roleOf(k)?.role,'legend',`${k} needs a playable legendary set`);
}
const original=M.newSave(17), text=M.serialize(original);
for (const S of M.SETS) {
  const save=M.deserialize(text);
  const run=M.startRun(save,{diff:1,set:S.id});
  assert.equal(run.foes.length,5);
  assert.equal(run.foes.at(-1).k,S.legend);
  assert.ok(ARENAS[S.arena],`Unknown arena for ${S.id}`);
  assert.equal(save.frags[S.id],0);
}
const old=JSON.parse(text); delete old.frags.bosquet; delete old.pity.bosquet;
const restored=M.deserialize(JSON.stringify(old));
assert.equal(restored.frags.bosquet,0); assert.deepEqual(restored.coll,original.coll);
for (const model of new Set(M.SETS.map(S=>arenaProfile(S.arena).model))) {
  const bytes=fs.readFileSync(new URL(`../models/arenas/${model}.glb`,import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67); assert.equal(bytes.readUInt32LE(8),bytes.length);
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for (const name of ['ArenaCenter','Boss','AllyLeft','AllyCenter','AllyRight']) assert.ok(doc.nodes.some(n=>n.name===name),`${model}: missing ${name}`);
  assert.ok(doc.buffers.every(b=>!b.uri),`${model}: requires an external buffer`);
}
console.log(`sets et arènes : ${M.SETS.length} sets accessibles, tous les légendaires, sauvegardes et 6 GLB vérifiés`);
