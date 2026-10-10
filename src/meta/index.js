// Boucle de progression (logique pure) : expéditions (difficulté → set → actes et bénédictions) → collection → entraînement / élévation.
export { CONFIG } from "./config.js";
export { SETS, SET, DIFFS, orderOf, speciesOf, contentErrors, roleOf, newSave, owns, formOf, levelCap } from "./state.js";
export {
  levelOf, eligible, itemBag, access, legendRate, legendChance, legendAttempt, expeditionRewards,
  startRun, shopView, buyBuff, rerollShop, runMods, usable, autoTeam, nextFightConfig, resolveFight, fightNext,
  cleared, choices, publicRun, finishRun, stopRun, playExpedition,
} from "./run.js";
export { buffPool, buffDef, setWeaknesses } from "./buffs.js";
export { elevate, elevationCost, buyStar, redeemShards } from "./progress.js";
export { serialize, deserialize, localStore } from "./save.js";
export { nextGoal, matName, legendFrom } from "./goals.js";
export { alliesOf, simulate } from "./battle.js";
