// Boucle de progression (logique pure) : expéditions → vœux → runs de capture → collection → entraînement / élévation.
export { CONFIG } from "./config.js";
export { SETS, SET, roleOf, newSave, owns, formOf, levelCap } from "./state.js";
export { playExpedition, rewardsOf, expeditionConfig, finishExpedition } from "./expedition.js";
export { startRun, fightNext, nextFightConfig, resolveFight, choices, finishRun, stopRun, publicRun, legendRate, legendChance, legendAttempt } from "./capture.js";
export { train, elevate, elevationCost, buyStar, redeemShards, setTeam } from "./progress.js";
export { serialize, deserialize, localStore } from "./save.js";
export { alliesOf, simulate } from "./battle.js";
