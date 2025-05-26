"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRADERS = void 0;
exports.getGraderById = getGraderById;
const constants_1 = require("./plugins/agentic/constants");
const memoryPoisoning_1 = require("./plugins/agentic/memoryPoisoning");
const asciiSmuggling_1 = require("./plugins/asciiSmuggling");
const beavertails_1 = require("./plugins/beavertails");
const bfla_1 = require("./plugins/bfla");
const bola_1 = require("./plugins/bola");
const competitors_1 = require("./plugins/competitors");
const contextComplianceAttack_1 = require("./plugins/contextComplianceAttack");
const contracts_1 = require("./plugins/contracts");
const crossSessionLeak_1 = require("./plugins/crossSessionLeak");
const debugAccess_1 = require("./plugins/debugAccess");
const divergentRepetition_1 = require("./plugins/divergentRepetition");
const excessiveAgency_1 = require("./plugins/excessiveAgency");
const hallucination_1 = require("./plugins/hallucination");
const harmbench_1 = require("./plugins/harmbench");
const graders_1 = require("./plugins/harmful/graders");
const hijacking_1 = require("./plugins/hijacking");
const imitation_1 = require("./plugins/imitation");
const indirectPromptInjection_1 = require("./plugins/indirectPromptInjection");
const intent_1 = require("./plugins/intent");
const mcp_1 = require("./plugins/mcp");
const overreliance_1 = require("./plugins/overreliance");
const pii_1 = require("./plugins/pii");
const pliny_1 = require("./plugins/pliny");
const policy_1 = require("./plugins/policy");
const politics_1 = require("./plugins/politics");
const promptExtraction_1 = require("./plugins/promptExtraction");
const ragDocumentExfiltration_1 = require("./plugins/ragDocumentExfiltration");
const rbac_1 = require("./plugins/rbac");
const reasoningDos_1 = require("./plugins/reasoningDos");
const religion_1 = require("./plugins/religion");
const shellInjection_1 = require("./plugins/shellInjection");
const sqlInjection_1 = require("./plugins/sqlInjection");
const ssrf_1 = require("./plugins/ssrf");
const toolDiscovery_1 = require("./plugins/toolDiscovery");
const toolDiscoveryMultiTurn_1 = require("./plugins/toolDiscoveryMultiTurn");
const unsafebench_1 = require("./plugins/unsafebench");
exports.GRADERS = {
    [constants_1.REDTEAM_MEMORY_POISONING_PLUGIN_ID]: new memoryPoisoning_1.MemoryPoisoningPluginGrader(),
    'promptfoo:redteam:mcp': new mcp_1.MCPPluginGrader(),
    'promptfoo:redteam:ascii-smuggling': new asciiSmuggling_1.AsciiSmugglingGrader(),
    'promptfoo:redteam:beavertails': new beavertails_1.BeavertailsGrader(),
    'promptfoo:redteam:bias:gender': new graders_1.GenderBiasGrader(),
    'promptfoo:redteam:bfla': new bfla_1.BflaGrader(),
    'promptfoo:redteam:bola': new bola_1.BolaGrader(),
    'promptfoo:redteam:cca': new contextComplianceAttack_1.CcaGrader(),
    'promptfoo:redteam:competitors': new competitors_1.CompetitorsGrader(),
    'promptfoo:redteam:contracts': new contracts_1.ContractsGrader(),
    'promptfoo:redteam:cross-session-leak': new crossSessionLeak_1.CrossSessionLeakGrader(),
    'promptfoo:redteam:debug-access': new debugAccess_1.DebugAccessGrader(),
    'promptfoo:redteam:divergent-repetition': new divergentRepetition_1.DivergentRepetitionGrader(),
    'promptfoo:redteam:excessive-agency': new excessiveAgency_1.ExcessiveAgencyGrader(),
    'promptfoo:redteam:tool-discovery': new toolDiscovery_1.ToolDiscoveryGrader(),
    'promptfoo:redteam:tool-discovery:multi-turn': new toolDiscoveryMultiTurn_1.ToolDiscoveryMultiTurnGrader(),
    'promptfoo:redteam:hallucination': new hallucination_1.HallucinationGrader(),
    'promptfoo:redteam:harmbench': new harmbench_1.HarmbenchGrader(),
    'promptfoo:redteam:harmful': new graders_1.HarmfulGrader(),
    'promptfoo:redteam:harmful:chemical-biological-weapons': new graders_1.HarmfulGrader(),
    'promptfoo:redteam:harmful:child-exploitation': new graders_1.ChildExploitationGrader(),
    'promptfoo:redteam:harmful:copyright-violations': new graders_1.CopyrightViolationGrader(),
    'promptfoo:redteam:harmful:cybercrime': new graders_1.CybercrimeGrader(),
    'promptfoo:redteam:harmful:cybercrime:malicious-code': new graders_1.CybercrimeGrader(),
    'promptfoo:redteam:harmful:graphic-content': new graders_1.GraphicContentGrader(),
    'promptfoo:redteam:harmful:harassment-bullying': new graders_1.HarmfulGrader(),
    'promptfoo:redteam:harmful:hate': new graders_1.HateGrader(),
    'promptfoo:redteam:harmful:illegal-activities': new graders_1.IllegalActivitiesGrader(),
    'promptfoo:redteam:harmful:illegal-drugs': new graders_1.IllegalDrugsGrader(),
    'promptfoo:redteam:harmful:illegal-drugs:meth': new graders_1.IllegalDrugsGrader(),
    'promptfoo:redteam:harmful:indiscriminate-weapons': new graders_1.IndiscriminateWeaponsGrader(),
    'promptfoo:redteam:harmful:insults': new graders_1.InsultsGrader(),
    'promptfoo:redteam:harmful:intellectual-property': new graders_1.CopyrightViolationGrader(),
    'promptfoo:redteam:harmful:misinformation-disinformation': new graders_1.HarmfulGrader(),
    'promptfoo:redteam:harmful:non-violent-crime': new graders_1.NonViolentCrimeGrader(),
    'promptfoo:redteam:harmful:privacy': new graders_1.HarmfulPrivacyGrader(),
    'promptfoo:redteam:harmful:profanity': new graders_1.ProfanityGrader(),
    'promptfoo:redteam:harmful:radicalization': new graders_1.RadicalizationGrader(),
    'promptfoo:redteam:harmful:self-harm': new graders_1.SelfHarmGrader(),
    'promptfoo:redteam:harmful:sex-crime': new graders_1.SexCrimeGrader(),
    'promptfoo:redteam:harmful:sexual-content': new graders_1.SexualContentGrader(),
    'promptfoo:redteam:harmful:specialized-advice': new graders_1.SpecializedAdviceGrader(),
    'promptfoo:redteam:harmful:unsafe-practices': new graders_1.UnsafePracticesGrader(),
    'promptfoo:redteam:harmful:violent-crime': new graders_1.ViolentCrimeGrader(),
    'promptfoo:redteam:harmful:weapons:ied': new graders_1.HarmfulGrader(),
    'promptfoo:redteam:hijacking': new hijacking_1.HijackingGrader(),
    'promptfoo:redteam:imitation': new imitation_1.ImitationGrader(),
    'promptfoo:redteam:indirect-prompt-injection': new indirectPromptInjection_1.IndirectPromptInjectionGrader(),
    'promptfoo:redteam:intent': new intent_1.IntentGrader(),
    'promptfoo:redteam:overreliance': new overreliance_1.OverrelianceGrader(),
    'promptfoo:redteam:pii': new pii_1.PiiGrader(),
    'promptfoo:redteam:pii:api-db': new pii_1.PiiGrader(),
    'promptfoo:redteam:pii:direct': new pii_1.PiiGrader(),
    'promptfoo:redteam:pii:session': new pii_1.PiiGrader(),
    'promptfoo:redteam:pii:social': new pii_1.PiiGrader(),
    'promptfoo:redteam:pliny': new pliny_1.PlinyGrader(),
    'promptfoo:redteam:policy': new policy_1.PolicyViolationGrader(),
    'promptfoo:redteam:politics': new politics_1.PoliticsGrader(),
    'promptfoo:redteam:prompt-extraction': new promptExtraction_1.PromptExtractionGrader(),
    'promptfoo:redteam:rag-document-exfiltration': new ragDocumentExfiltration_1.RagDocumentExfiltrationGrader(),
    'promptfoo:redteam:rbac': new rbac_1.RbacGrader(),
    'promptfoo:redteam:reasoning-dos': new reasoningDos_1.ReasoningDosGrader(),
    'promptfoo:redteam:religion': new religion_1.ReligionGrader(),
    'promptfoo:redteam:shell-injection': new shellInjection_1.ShellInjectionGrader(),
    'promptfoo:redteam:sql-injection': new sqlInjection_1.SqlInjectionGrader(),
    'promptfoo:redteam:ssrf': new ssrf_1.SsrfGrader(),
    'promptfoo:redteam:unsafebench': new unsafebench_1.UnsafeBenchGrader(),
};
function getGraderById(id) {
    // First try to get the exact grader
    const grader = id in exports.GRADERS ? exports.GRADERS[id] : undefined;
    // If not found but the ID starts with 'promptfoo:redteam:harmful', use the general harmful grader
    if (!grader && id.startsWith('promptfoo:redteam:harmful')) {
        return exports.GRADERS['promptfoo:redteam:harmful'];
    }
    return grader;
}
//# sourceMappingURL=graders.js.map