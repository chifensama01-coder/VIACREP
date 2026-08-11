// The default narrative text, lifted verbatim from the `Narrative_Report` sheet
// (sections 7-10 and 12). These seed a brand-new reporting period; after that,
// each period carries forward whatever staff wrote last time.

export const DEFAULT_OBJECTIVES = [
  "Increase awareness on sexual and reproductive health rights (SRHR) among vulnerable populations",
  "Provide education on STI prevention, testing, and treatment options",
  "Address drug abuse and its impact on community health and wellbeing",
  "Strengthen community engagement with IDPs, host communities, and key populations",
  "Promote gender-sensitive approaches in health service delivery",
].join("\n");

export const DEFAULT_METHODOLOGY = [
  "Community mobilization through local leaders and peer educators",
  "Interactive group discussions and participatory learning sessions",
  "Distribution of Information, Education and Communication (IEC) materials",
  "One-on-one counseling and referral services for identified cases",
  "Data collection using standardized session tracking forms",
].join("\n");

export const DEFAULT_LESSONS_LEARNT = [
  "Community engagement is more effective when local leaders are involved from the planning stage",
  "Participants expressed preference for sessions conducted in local languages",
  "Combining health education with practical demonstrations increases retention and behavior change",
  "Follow-up sessions are needed to reinforce key messages and track progress",
  "Youth respond well to peer-led education approaches",
].join("\n");

export const DEFAULT_CHALLENGES = [
  "Limited transportation to reach remote communities",
  "Language barriers with some displaced populations",
  "Stigma around certain topics (STI, drug abuse) limiting open participation",
  "Competing priorities and low attendance during farming/market days",
  "Insufficient IEC materials to meet community demand",
].join("\n");

export const DEFAULT_RECOMMENDATIONS = [
  "Increase budget allocation for transportation to remote areas",
  "Train additional peer educators from local communities",
  "Schedule sessions around community calendars to maximize attendance",
  "Procure additional IEC materials in local languages",
].join("\n");

/** Lead-in sentences the workbook prints above each bullet list. */
export const NARRATIVE_LEAD_INS = {
  objectives:
    "The community outreach sessions aimed to achieve the following objectives:",
  methodology:
    "The following approaches were employed during the community outreach sessions:",
  lessonsLearnt: "Key lessons and feedback from the reporting period include:",
  challenges:
    "The following challenges were encountered during implementation:",
  recommendations:
    "Based on lessons learnt and challenges, the following recommendations are proposed:",
} as const;
