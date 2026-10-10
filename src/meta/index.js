// Boucle de progression (logique pure) : expéditions → vœux → runs de capture → collection → entraînement / élévation.
export { CONFIG } from "./config.js";
export { SETS, SET, roleOf, newSave, owns, formOf, levelCap } from "./state.js";
export {
  levelOf, eligible, access, legendRate, legendChance, legendAttempt, expeditionRewards,
  startRun, usable, autoTeam, nextFightConfig, resolveFight, fightNext, cleared, choices, publicRun, finishRun, stopRun, playExpedition,
} from "./run.js";
export { train, elevate, elevationCost, buyStar, redeemShards } from "./progress.js";
export { serialize, deserialize, localStore } from "./save.js";
export { alliesOf, simulate } from "./battle.js";
