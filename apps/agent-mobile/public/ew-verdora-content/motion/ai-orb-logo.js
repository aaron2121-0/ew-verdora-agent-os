// Compatibility URL for clients which cached the previous ai-ui module.
// Use the same bounded floral renderer rather than animated overflow-visible SVG.
import {mountSafeAIOrb} from "../../ai-orb-safe.js";
const motion=window.VerdoraMotion=window.VerdoraMotion||{};
motion.mountAiOrb=mountSafeAIOrb;
