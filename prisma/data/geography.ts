// AUTO-GENERATED from Sheet1 of Vision_In_Action_Reporting_Template.xlsx.
// The workbook stores geography as a flat "Division - Subdivision" label;
// this expands it into the Region -> Division -> Subdivision -> Community tree.
// Bamenda I-IV sit in Mezam division, North West region.

export type SeedRegion = {
  name: string;
  divisions: {
    name: string;
    subdivisions: { name: string; communities: string[] }[];
  }[];
};

export const GEOGRAPHY: SeedRegion[] = [
  {
    name: "South West",
    divisions: [
      {
        name: "Fako",
        subdivisions: [
          {
            name: "Buea",
            communities: [
              "Likoko Membea",
              "Lysoka",
              "Bitingui",
              "Bokoko",
              "Bokova",
              "Sandpit",
              "Bonduma",
              "Bokwai",
              "Bokwango",
              "Bolifamba (Mile 16)",
              "Bonakanda",
              "Bova I",
              "Bova II",
              "Bulu",
              "Bwassa",
              "Ewonda",
              "Likombe",
              "Liongo",
              "Lissoka (Lysoka Bwielei)",
              "Lower Muea",
              "Middle Bonjongo",
              "Mile 16",
              "Mile 17",
              "Molyko",
              "Muea (Upper & Lower Muea)",
              "Small Soppo",
              "Tole",
              "Wututu",
            ],
          },
          {
            name: "Limbe I",
            communities: [
              "Bimbia",
              "Mokundange",
              "CDC Camp",
              "Down Beach",
              "New Town",
            ],
          },
          {
            name: "Limbe II",
            communities: [
              "Batoke",
              "Bakingili",
              "Wovia",
              "Moliweh",
              "Mile 1",
              "Mile 2",
            ],
          },
          {
            name: "Limbe III",
            communities: [
              "Debundscha",
              "Bobende",
              "Mokoko",
              "Mile 4",
              "Idenau",
            ],
          },
          {
            name: "Tiko",
            communities: [
              "Missellele",
              "Mondoni",
              "Ombe",
              "Moquo",
              "Mudeka",
              "Tiko Town",
              "Likomba",
              "Mutengene",
            ],
          },
        ],
      },
      {
        name: "Meme",
        subdivisions: [
          {
            name: "Kumba I",
            communities: [
              "Hausa Quarter",
              "kumba Town",
              "Three Corners",
            ],
          },
          {
            name: "Kumba II",
            communities: [
              "Barombi Mbo",
              "Mbengui Road",
              "Fiango",
              "Kosala",
            ],
          },
          {
            name: "Kumba III",
            communities: [
              "Kumba Mbeng",
              "Malende",
              "Mabonji",
              "Bekondo",
            ],
          },
        ],
      },
    ],
  },
  {
    name: "North West",
    divisions: [
      {
        name: "Mezam",
        subdivisions: [
          {
            name: "Bamenda I",
            communities: [
              "Commercial Avenue",
              "Old Town",
              "Up Station",
              "Hospital Roundabout",
              "Food Market Area",
              "Bamendankwe",
              "Abangoh",
              "Alahnting",
              "Ayaba",
              "Ntafi",
              "Ntamulung",
              "Ntasen",
            ],
          },
          {
            name: "Bamenda II",
            communities: [
              "Agyati",
              "Nsongwa",
              "Mankon",
              "Mobile Nkwen",
              "City Chemist",
              "Finance Junction",
              "Veterinary Junction",
              "Bangshie",
              "Nchoubu",
              "Ntarinkon",
              "Ngomgham",
              "Nitop I to IV",
              "Azire",
              "Ntamulung",
              "Alakuma",
              "Mile 2 Nkwen",
            ],
          },
          {
            name: "Bamenda III",
            communities: [
              "Mile 3 Nkwen",
              "Mile 4 Nkwen",
              "Mile 5 Nkwen",
              "Foncha Junction",
              "Rendezvous",
              "Sisia",
              "Ntambag",
              "Mbelewa",
              "Ndzah",
              "Ntasen",
            ],
          },
          {
            name: "Bamenda IV",
            communities: [
              "Bambui",
              "Bambili",
            ],
          },
        ],
      },
    ],
  },
];

export const SEEDED_COMMUNITY_COUNT = 103;
