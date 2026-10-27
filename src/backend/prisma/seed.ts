import "dotenv/config";
import {
  DatePrecision,
  Gender,
  MarriageStatus,
  ParentKind,
  PrismaClient,
} from "@prisma/client";
import argon2 from "argon2";
import {
  canonicalSpousePair,
  validateParentRelationships,
} from "../src/modules/trees/relationship-validation.js";

const prisma = new PrismaClient();
const ADMIN_ID = "seed-user-admin";
const TREE_ID = "seed-tree-british-royal-family";

type SeedPerson = {
  key: string;
  name: string;
  gender: Gender;
  year?: number;
  aliases?: string[];
  deceased?: boolean;
  deathYear?: number;
};

const people: SeedPerson[] = [
  {
    key: "philip",
    name: "Hoàng thân Philip",
    gender: Gender.MALE,
    deceased: true,
    deathYear: 2021,
  },
  {
    key: "elizabeth",
    name: "Nữ hoàng Elizabeth II",
    gender: Gender.FEMALE,
    deceased: true,
    deathYear: 2022,
  },
  { key: "charles", name: "Charles III", gender: Gender.MALE, year: 1948 },
  { key: "anne", name: "Anne", gender: Gender.FEMALE, year: 1950 },
  {
    key: "andrew",
    name: "Andrew Mountbatten-Windsor",
    gender: Gender.MALE,
    year: 1960,
  },
  { key: "edward", name: "Edward", gender: Gender.MALE, year: 1964 },
  { key: "diana", name: "Diana Spencer", gender: Gender.FEMALE },
  { key: "camilla", name: "Camilla Parker Bowles", gender: Gender.FEMALE },
  { key: "mark", name: "Mark Phillips", gender: Gender.MALE },
  { key: "timothy", name: "Timothy Laurence", gender: Gender.MALE },
  { key: "sarah", name: "Sarah Ferguson", gender: Gender.FEMALE },
  { key: "sophie", name: "Sophie Rhys-Jones", gender: Gender.FEMALE },
  { key: "william", name: "William", gender: Gender.MALE, year: 1982 },
  { key: "harry", name: "Harry", gender: Gender.MALE, year: 1984 },
  { key: "peter", name: "Peter Phillips", gender: Gender.MALE, year: 1977 },
  {
    key: "zara",
    name: "Zara Tindall",
    gender: Gender.FEMALE,
    year: 1981,
    aliases: ["Zara Phillips"],
  },
  { key: "beatrice", name: "Beatrice", gender: Gender.FEMALE, year: 1988 },
  { key: "eugenie", name: "Eugenie", gender: Gender.FEMALE, year: 1990 },
  {
    key: "louise",
    name: "Louise Mountbatten-Windsor",
    gender: Gender.FEMALE,
    year: 2003,
  },
  {
    key: "james",
    name: "James Mountbatten-Windsor",
    gender: Gender.MALE,
    year: 2007,
  },
  { key: "catherine", name: "Catherine Middleton", gender: Gender.FEMALE },
  { key: "meghan", name: "Meghan Markle", gender: Gender.FEMALE },
  { key: "autumn", name: "Autumn Kelly", gender: Gender.FEMALE },
  { key: "mike", name: "Mike Tindall", gender: Gender.MALE },
  { key: "edoardo", name: "Edoardo Mapelli Mozzi", gender: Gender.MALE },
  { key: "jack", name: "Jack Brooksbank", gender: Gender.MALE },
  {
    key: "george",
    name: "George Alexander Louis",
    gender: Gender.MALE,
    year: 2013,
  },
  {
    key: "charlotte",
    name: "Charlotte Elizabeth Diana",
    gender: Gender.FEMALE,
    year: 2015,
  },
  {
    key: "louis",
    name: "Louis Arthur Charles",
    gender: Gender.MALE,
    year: 2018,
  },
  { key: "archie", name: "Archie Harrison", gender: Gender.MALE, year: 2019 },
  { key: "lilibet", name: "Lilibet Diana", gender: Gender.FEMALE, year: 2021 },
  {
    key: "savannah",
    name: "Savannah Phillips",
    gender: Gender.FEMALE,
    year: 2010,
  },
  { key: "isla", name: "Isla Phillips", gender: Gender.FEMALE, year: 2012 },
  { key: "mia", name: "Mia Grace Tindall", gender: Gender.FEMALE, year: 2014 },
  {
    key: "lena",
    name: "Lena Elizabeth Tindall",
    gender: Gender.FEMALE,
    year: 2018,
  },
  {
    key: "lucas",
    name: "Lucas Philip Tindall",
    gender: Gender.MALE,
    year: 2021,
  },
  {
    key: "sienna",
    name: "Sienna Elizabeth Mapelli Mozzi",
    gender: Gender.FEMALE,
    year: 2021,
  },
  {
    key: "athena",
    name: "Athena Elizabeth Rose Mapelli Mozzi",
    gender: Gender.FEMALE,
    year: 2025,
  },
  {
    key: "christopher",
    name: "Christopher Woolf Mapelli Mozzi",
    gender: Gender.MALE,
    year: 2016,
  },
  {
    key: "august",
    name: "August Philip Hawke Brooksbank",
    gender: Gender.MALE,
    year: 2021,
  },
  {
    key: "ernest",
    name: "Ernest George Ronnie Brooksbank",
    gender: Gender.MALE,
    year: 2023,
  },
];

const personId = (key: string) => `seed-person-${key}`;
const yearDate = (year: number) => new Date(Date.UTC(year, 0, 1));

type ParentLink = [parent: string, child: string, order: number];
const parentLinks: ParentLink[] = [];
const children = (parents: string[], entries: Array<[string, number]>) => {
  for (const parent of parents)
    for (const [child, order] of entries)
      parentLinks.push([parent, child, order]);
};

children(
  ["philip", "elizabeth"],
  [
    ["charles", 1],
    ["anne", 2],
    ["andrew", 3],
    ["edward", 4],
  ],
);
children(
  ["charles", "diana"],
  [
    ["william", 1],
    ["harry", 2],
  ],
);
children(
  ["mark", "anne"],
  [
    ["peter", 1],
    ["zara", 2],
  ],
);
children(
  ["andrew", "sarah"],
  [
    ["beatrice", 1],
    ["eugenie", 2],
  ],
);
children(
  ["edward", "sophie"],
  [
    ["louise", 1],
    ["james", 2],
  ],
);
children(
  ["william", "catherine"],
  [
    ["george", 1],
    ["charlotte", 2],
    ["louis", 3],
  ],
);
children(
  ["harry", "meghan"],
  [
    ["archie", 1],
    ["lilibet", 2],
  ],
);
children(
  ["peter", "autumn"],
  [
    ["savannah", 1],
    ["isla", 2],
  ],
);
children(
  ["zara", "mike"],
  [
    ["mia", 1],
    ["lena", 2],
    ["lucas", 3],
  ],
);
children(
  ["beatrice", "edoardo"],
  [
    ["sienna", 1],
    ["athena", 2],
  ],
);
children(
  ["eugenie", "jack"],
  [
    ["august", 1],
    ["ernest", 2],
  ],
);
children(["edoardo"], [["christopher", 1]]);

type SpouseLink = {
  first: string;
  second: string;
  status?: MarriageStatus;
  order?: number;
  startYear?: number;
  endYear?: number;
};
const spouseLinks: SpouseLink[] = [
  { first: "philip", second: "elizabeth" },
  {
    first: "charles",
    second: "diana",
    status: MarriageStatus.DIVORCED,
    order: 1,
    endYear: 1996,
  },
  { first: "charles", second: "camilla", order: 2, startYear: 2005 },
  {
    first: "anne",
    second: "mark",
    status: MarriageStatus.DIVORCED,
    order: 1,
    endYear: 1992,
  },
  { first: "anne", second: "timothy", order: 2, startYear: 1992 },
  {
    first: "andrew",
    second: "sarah",
    status: MarriageStatus.DIVORCED,
    endYear: 1996,
  },
  { first: "edward", second: "sophie" },
  { first: "william", second: "catherine" },
  { first: "harry", second: "meghan" },
  {
    first: "peter",
    second: "autumn",
    status: MarriageStatus.DIVORCED,
    endYear: 2021,
  },
  { first: "zara", second: "mike" },
  { first: "beatrice", second: "edoardo" },
  { first: "eugenie", second: "jack" },
];

async function main() {
  validateParentRelationships(
    parentLinks.map(([parent, child]) => ({
      fromPersonId: personId(parent),
      toPersonId: personId(child),
      parentKind: ParentKind.BIOLOGICAL,
    })),
  );
  const passwordHash = await argon2.hash("abcd1234");
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "Quản trị viên",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      id: ADMIN_ID,
      email: "admin@example.com",
      name: "Quản trị viên",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.relationshipType.upsert({
    where: { code: "PARENT_CHILD" },
    update: { label: "Bố/mẹ - con", isDirected: true },
    create: { code: "PARENT_CHILD", label: "Bố/mẹ - con", isDirected: true },
  });
  await prisma.relationshipType.upsert({
    where: { code: "SPOUSE" },
    update: { label: "Vợ chồng", isDirected: false },
    create: { code: "SPOUSE", label: "Vợ chồng", isDirected: false },
  });
  await prisma.familyTree.upsert({
    where: { id: TREE_ID },
    update: { createdById: admin.id },
    create: {
      id: TREE_ID,
      name: "Hoàng gia Anh – Elizabeth II và Philip",
      description:
        "Gia phả mẫu từ Elizabeth II và Hoàng thân Philip, gồm bốn thế hệ.",
      originPlace: "Vương quốc Anh",
      createdById: admin.id,
    },
  });
  await prisma.membership.upsert({
    where: { treeId_userId: { treeId: TREE_ID, userId: admin.id } },
    update: { role: "ADMIN" },
    create: { treeId: TREE_ID, userId: admin.id, role: "ADMIN" },
  });
  for (const person of people) {
    const data = {
      fullName: person.name,
      aliases: person.aliases ?? [],
      gender: person.gender,
      birthDate: person.year ? yearDate(person.year) : null,
      birthDatePrecision: person.year ? DatePrecision.YEAR : null,
      isDeceased: person.deceased ?? false,
      deathDate: person.deathYear ? yearDate(person.deathYear) : null,
      deathDatePrecision: person.deathYear ? DatePrecision.YEAR : null,
    };
    await prisma.person.upsert({
      where: { id: personId(person.key) },
      update: data,
      create: { id: personId(person.key), ...data },
    });
    await prisma.familyTreePerson.upsert({
      where: {
        treeId_personId: { treeId: TREE_ID, personId: personId(person.key) },
      },
      update: {},
      create: { treeId: TREE_ID, personId: personId(person.key) },
    });
  }
  for (const [parent, child, order] of parentLinks) {
    const id = `seed-rel-parent-${parent}-${child}`;
    await prisma.relationship.upsert({
      where: { id },
      update: { birthOrder: order },
      create: {
        id,
        treeId: TREE_ID,
        typeCode: "PARENT_CHILD",
        fromPersonId: personId(parent),
        toPersonId: personId(child),
        parentKind: ParentKind.BIOLOGICAL,
        birthOrder: order,
      },
    });
  }
  for (const link of spouseLinks) {
    const [from, to] = canonicalSpousePair(
      personId(link.first),
      personId(link.second),
    );
    const id = `seed-rel-spouse-${[link.first, link.second].sort().join("-")}`;
    const data = {
      marriageStatus: link.status ?? MarriageStatus.MARRIED,
      marriageOrder: link.order ?? 1,
      startedAt: link.startYear ? yearDate(link.startYear) : null,
      startedAtPrecision: link.startYear ? DatePrecision.YEAR : null,
      endedAt: link.endYear ? yearDate(link.endYear) : null,
      endedAtPrecision: link.endYear ? DatePrecision.YEAR : null,
    };
    await prisma.relationship.upsert({
      where: { id },
      update: data,
      create: {
        id,
        treeId: TREE_ID,
        typeCode: "SPOUSE",
        fromPersonId: from,
        toPersonId: to,
        ...data,
      },
    });
  }
}

main()
  .then(() =>
    console.log(
      "Seeded relationship master data and the British royal family demo.",
    ),
  )
  .finally(async () => prisma.$disconnect());
