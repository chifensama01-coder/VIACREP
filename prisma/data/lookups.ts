// Seed values for the lookup lists.
//
// Projects and age groups come from the dropdown validations on the `Data_Entry`
// sheet, verbatim. Thematic Area has no validation list in the workbook — staff
// type it free-hand — so we seed the topics the narrative report names and let
// anyone add more.

/** `Data_Entry!H` validation list. */
export const PROJECTS = [
  "SPS Project",
  "VIAC Program",
  "HVF Project",
  "MAMA Project",
  "WHW Project",
];

/** `Data_Entry!G` validation list. Ordered youngest → oldest. */
export const AGE_GROUPS = ["Adolescents", "Youth", "Adults"];

/** Free-entry in the workbook; these are the topics the narrative report names. */
export const THEMATIC_AREAS = [
  "Sexual & Reproductive Health Rights (SRHR)",
  "STI Prevention & Treatment",
  "HIV Testing & Counselling",
  "Drug & Substance Abuse",
  "Gender-Based Violence",
  "Family Planning",
  "Menstrual Health & Hygiene",
  "Mental Health & Psychosocial Support",
];

/** Not in the workbook — added at VIAC's request so reports can name the format. */
export const ACTIVITY_TYPES = [
  "Community Outreach",
  "Awareness Campaign",
  "Focus Group Discussion",
  "Peer Education Session",
  "Health Talk",
  "Training Workshop",
  "Door-to-Door Sensitisation",
  "Referral & Counselling",
];

/**
 * The count matrix, column for column with `Data_Entry!I:T`.
 *
 * The sheet distinguishes its six MALE/FEMALE column pairs only by trailing
 * punctuation (MALE, MALE:, MALE., MALE-, MALE_) because Excel will not accept
 * duplicate header names. `exportMaleHeader` / `exportFemaleHeader` preserve
 * those exact strings so the Excel export regenerates a workbook VIAC's existing
 * formulas still recognise.
 */
export const KEY_POPULATIONS = [
  {
    name: "Sex Workers",
    shortName: "Sex Workers",
    tracksMale: true,
    tracksFemale: true,
    maleLabel: "Male",
    femaleLabel: "Female",
    exportGroupLabel: "Sex workers",
    exportMaleHeader: "MALE",
    exportFemaleHeader: "FEMALE",
  },
  {
    name: "Gender Minorities",
    shortName: "Gender Minorities",
    tracksMale: true,
    tracksFemale: true,
    maleLabel: "Male",
    femaleLabel: "Female",
    exportGroupLabel: "Gender Minorities",
    exportMaleHeader: "MALE:",
    exportFemaleHeader: "FEMALE:",
  },
  {
    name: "Internally Displaced Persons (IDPs)",
    shortName: "IDPs",
    tracksMale: true,
    tracksFemale: true,
    maleLabel: "Male",
    femaleLabel: "Female",
    exportGroupLabel: "IDP ",
    exportMaleHeader: "MALE.",
    exportFemaleHeader: "FEMALE.",
  },
  {
    name: "Persons with Disabilities",
    shortName: "Persons with Disabilities",
    tracksMale: true,
    tracksFemale: true,
    maleLabel: "Male",
    femaleLabel: "Female",
    exportGroupLabel: "Persons with disabilities",
    exportMaleHeader: "MALE-",
    exportFemaleHeader: "FEMALE-",
  },
  {
    name: "Adolescent Girls & Young Women (AGYW)",
    shortName: "AGYW",
    tracksMale: false,
    tracksFemale: true,
    maleLabel: "Male",
    femaleLabel: "Female",
    exportGroupLabel: "AGY-W",
    exportMaleHeader: null,
    exportFemaleHeader: "FEMALE_",
  },
  {
    name: "Adolescent & Young Boys/Men (AYBM)",
    shortName: "AYBM",
    tracksMale: true,
    tracksFemale: false,
    maleLabel: "Male",
    femaleLabel: "Female",
    exportGroupLabel: "ABY-M",
    exportMaleHeader: "MALE_",
    exportFemaleHeader: null,
  },
  {
    name: "General",
    shortName: "General",
    tracksMale: true,
    tracksFemale: true,
    // The sheet labels this pair "MEN" / "WOMEN" rather than Male / Female.
    maleLabel: "Men",
    femaleLabel: "Women",
    exportGroupLabel: "",
    exportMaleHeader: "MEN",
    exportFemaleHeader: "WOMEN",
  },
];
