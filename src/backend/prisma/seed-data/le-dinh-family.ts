/**
 * Dòng họ mẫu Lê Đình (hư cấu): 54 người, 5 đời, có tái hôn, ly hôn, con nuôi,
 * anh chị em cùng cha khác mẹ, người trùng tên và tiểu sử để chatbot (LMS-016) tìm kiếm.
 * Bộ câu hỏi đánh giá chatbot lấy đáp án từ đúng dữ liệu này, sửa dữ liệu thì phải chạy lại test của module `ai`.
 */
import {
  DatePrecision,
  Gender,
  MarriageStatus,
  ParentKind,
  type PrismaClient,
} from "@prisma/client";
import {
  canonicalSpousePair,
  validateParentRelationships,
} from "../../src/modules/trees/relationship-validation.js";

export const LE_DINH_TREE_ID = "seed-tree-le-dinh-an-phu";

export type FamilySeedPerson = {
  key: string;
  name: string;
  gender: Gender;
  /** "1905" (chỉ năm) hoặc "1905-03-12" (đủ ngày). */
  birth?: string;
  death?: string;
  aliases?: string[];
  occupation?: string;
  hometown?: string;
  currentResidence?: string;
  burialPlace?: string;
  biography?: string;
};

const M = Gender.MALE;
const F = Gender.FEMALE;
const HOMETOWN = "Làng An Phú, Nam Định";

export const leDinhPeople: FamilySeedPerson[] = [
  // Đời 1
  {
    key: "khang",
    name: "Lê Đình Khang",
    gender: M,
    birth: "1905-03-12",
    death: "1988-11-04",
    aliases: ["Cụ Đồ Khang"],
    occupation: "Thầy đồ",
    hometown: HOMETOWN,
    burialPlace: "Nghĩa trang làng An Phú",
    biography:
      "Thầy đồ dạy chữ Nho cho trẻ con trong làng An Phú từ năm 1925. Năm 1932 cùng các cụ trong làng góp công dựng nhà thờ họ Lê Đình. Sau năm 1954 chuyển sang dạy chữ quốc ngữ ở lớp bình dân học vụ.",
  },
  {
    key: "lua",
    name: "Phạm Thị Lụa",
    gender: F,
    birth: "1908",
    death: "1940-07-21",
    occupation: "Thợ dệt",
    biography:
      "Vợ cả của cụ Khang, làm nghề dệt vải. Mất năm 1940 vì bệnh thương hàn khi các con còn nhỏ.",
  },
  {
    key: "hien",
    name: "Đỗ Thị Hiền",
    gender: F,
    birth: "1915-02-10",
    death: "2009-08-15",
    aliases: ["Cụ bà Hiền"],
    occupation: "Buôn bán vải",
    biography:
      "Vợ kế của cụ Khang từ năm 1941. Một mình buôn vải ở chợ Rồng, nuôi dạy cả con riêng của chồng lẫn con chung.",
  },
  // Đời 2
  {
    key: "phuc",
    name: "Lê Đình Phúc",
    gender: M,
    birth: "1928-05-20",
    death: "2010-10-02",
    occupation: "Nông dân",
    hometown: HOMETOWN,
    biography:
      "Con trưởng của cụ Khang, giữ việc trưởng họ từ năm 1988. Từng đi dân công hỏa tuyến thời kháng chiến chống Pháp. Cả đời làm ruộng ở làng An Phú và trông nom nhà thờ họ.",
  },
  {
    key: "tam",
    name: "Vũ Thị Tâm",
    gender: F,
    birth: "1930-04-05",
    death: "2018-12-01",
    occupation: "Nông dân",
  },
  {
    key: "mai",
    name: "Lê Thị Mai",
    gender: F,
    birth: "1931-09-09",
    death: "2015-03-03",
    occupation: "Thợ may",
    biography:
      "Con gái cụ Khang và cụ Lụa. Lấy chồng về làng Cổ Lễ, làm thợ may.",
  },
  {
    key: "bao-nguyen",
    name: "Nguyễn Văn Bảo",
    gender: M,
    birth: "1929",
    death: "1995",
    occupation: "Thợ mộc",
    hometown: "Làng Cổ Lễ, Nam Định",
  },
  {
    key: "loc",
    name: "Lê Đình Lộc",
    gender: M,
    birth: "1942-08-17",
    death: "2019-01-25",
    aliases: ["Ông giáo Lộc"],
    occupation: "Giáo viên Toán",
    biography:
      "Dạy Toán ở trường cấp ba Nam Trực hơn ba mươi năm. Ly hôn với bà Nga năm 1975, năm 1978 lấy bà Yến. Năm 1986 hai vợ chồng nhận nuôi cháu An.",
  },
  {
    key: "nga",
    name: "Trần Thị Nga",
    gender: F,
    birth: "1946",
    occupation: "Kế toán",
    currentResidence: "Hà Nội",
  },
  {
    key: "yen",
    name: "Hoàng Thị Yến",
    gender: F,
    birth: "1950",
    occupation: "Y tá",
  },
  {
    key: "tho",
    name: "Lê Đình Thọ",
    gender: M,
    birth: "1945-01-15",
    occupation: "Kỹ sư thủy lợi (đã nghỉ hưu)",
    currentResidence: HOMETOWN,
    biography:
      "Kỹ sư thủy lợi, tham gia xây dựng hệ thống đê sông Đào. Nghỉ hưu năm 2005, về quê lo việc họ và chép lại cuốn gia phả chữ Nho sang chữ quốc ngữ năm 2012.",
  },
  {
    key: "hoa",
    name: "Bùi Thị Hoa",
    gender: F,
    birth: "1948",
    occupation: "Giáo viên mầm non",
  },
  {
    key: "hanh",
    name: "Lê Thị Hạnh",
    gender: F,
    birth: "1949",
    occupation: "Dược sĩ",
    currentResidence: "Hải Phòng",
  },
  {
    key: "kien",
    name: "Đinh Văn Kiên",
    gender: M,
    birth: "1947",
    death: "2020-06-30",
    occupation: "Thuyền trưởng",
    biography: "Làm thuyền trưởng tàu biển chạy tuyến Hải Phòng – Hồng Kông.",
  },
  // Đời 3
  {
    key: "hung",
    name: "Lê Đình Hùng",
    gender: M,
    birth: "1952-11-03",
    occupation: "Kỹ sư cầu đường",
    biography:
      "Kỹ sư cầu đường, tham gia xây nhiều cây cầu ở miền Bắc. Làm trưởng họ Lê Đình từ năm 2010, sau khi bố là ông Phúc mất.",
  },
  {
    key: "dung-phan",
    name: "Phan Thị Dung",
    gender: F,
    birth: "1956",
  },
  {
    key: "lan",
    name: "Lê Thị Lan",
    gender: F,
    birth: "1955",
    occupation: "Giáo viên Văn",
  },
  {
    key: "hai",
    name: "Trịnh Văn Hải",
    gender: M,
    birth: "1952",
    occupation: "Cán bộ ngân hàng",
  },
  {
    key: "dung",
    name: "Lê Đình Dũng",
    gender: M,
    birth: "1958-02-14",
    death: "1979-02-17",
    occupation: "Bộ đội",
    burialPlace: "Nghĩa trang liệt sĩ Vị Xuyên, Hà Giang",
    biography:
      "Nhập ngũ năm 1976. Hy sinh ngày 17/2/1979 khi bảo vệ biên giới phía Bắc ở Hà Giang, được công nhận là liệt sĩ.",
  },
  {
    key: "thu",
    name: "Nguyễn Thị Thu",
    gender: F,
    birth: "1956",
    occupation: "Buôn bán",
  },
  {
    key: "lam",
    name: "Hồ Văn Lâm",
    gender: M,
    birth: "1953",
  },
  {
    key: "tai",
    name: "Nguyễn Văn Tài",
    gender: M,
    birth: "1960",
    occupation: "Thợ mộc",
    biography: "Theo nghề mộc của bố, mở xưởng đồ gỗ ở làng Cổ Lễ.",
  },
  {
    key: "toan",
    name: "Lê Đình Toàn",
    gender: M,
    birth: "1968",
    occupation: "Chủ xưởng may",
    currentResidence: "TP. Hồ Chí Minh",
    biography:
      "Con của ông Lộc và bà Nga. Năm 1990 vào Sài Gòn lập nghiệp, mở xưởng may ở quận Tân Bình.",
  },
  {
    key: "lien",
    name: "Mạc Thị Liên",
    gender: F,
    birth: "1970",
    currentResidence: "TP. Hồ Chí Minh",
  },
  {
    key: "ngoc",
    name: "Lê Thị Ngọc",
    gender: F,
    birth: "1980",
    occupation: "Kiến trúc sư",
    biography:
      "Du học thạc sĩ kiến trúc ở Nhật Bản từ năm 2005 đến 2007, hiện làm việc ở Hà Nội.",
  },
  {
    key: "an",
    name: "Lê Đình An",
    gender: M,
    birth: "1985",
    occupation: "Lập trình viên",
    currentResidence: "Đà Nẵng",
    biography:
      "Được ông Lộc và bà Yến nhận làm con nuôi năm 1986. Hiện làm lập trình viên ở Đà Nẵng.",
  },
  {
    key: "minh",
    name: "Lê Đình Minh",
    gender: M,
    birth: "1972-06-01",
    occupation: "Giảng viên đại học",
    currentResidence: "Hà Nội",
    biography:
      "Giảng viên khoa Công nghệ thông tin. Người khởi xướng việc số hóa gia phả họ Lê Đình.",
  },
  {
    key: "thuy",
    name: "Ngô Thị Thủy",
    gender: F,
    birth: "1974",
    occupation: "Kế toán",
  },
  {
    key: "quang",
    name: "Lê Đình Quang",
    gender: M,
    birth: "1975",
    occupation: "Kinh doanh vật liệu xây dựng",
  },
  {
    key: "van",
    name: "Đặng Thị Vân",
    gender: F,
    birth: "1978",
  },
  {
    key: "thao",
    name: "Lê Thị Thảo",
    gender: F,
    birth: "1978",
    occupation: "Nhà báo",
  },
  {
    key: "thang",
    name: "Lý Văn Thắng",
    gender: M,
    birth: "1975",
  },
  {
    key: "ha",
    name: "Đinh Thị Hà",
    gender: F,
    birth: "1975",
    occupation: "Dược sĩ",
  },
  {
    key: "long",
    name: "Đinh Văn Long",
    gender: M,
    birth: "1977",
    occupation: "Sĩ quan hải quân",
  },
  {
    key: "xuan",
    name: "Kha Thị Xuân",
    gender: F,
    birth: "1980",
  },
  // Đời 4
  {
    key: "tuan",
    name: "Lê Đình Tuấn",
    gender: M,
    birth: "1980",
    occupation: "Kỹ sư xây dựng",
  },
  {
    key: "diep",
    name: "Châu Thị Diệp",
    gender: F,
    birth: "1984",
  },
  {
    key: "huong",
    name: "Lê Thị Hương",
    gender: F,
    birth: "1983",
    occupation: "Bác sĩ nhi khoa",
    biography: "Bác sĩ khoa Nhi, Bệnh viện Đa khoa tỉnh Nam Định.",
  },
  {
    key: "tri",
    name: "Mai Văn Trí",
    gender: M,
    birth: "1981",
  },
  {
    key: "duc",
    name: "Trịnh Minh Đức",
    gender: M,
    birth: "1982",
    occupation: "Phi công",
  },
  {
    key: "khoi",
    name: "Lê Đình Khôi",
    gender: M,
    birth: "1995",
  },
  {
    key: "my",
    name: "Tạ Thị My",
    gender: F,
    birth: "1997",
  },
  {
    key: "nam",
    name: "Lê Đình Nam",
    gender: M,
    birth: "1998",
    occupation: "Kỹ sư phần mềm",
    currentResidence: "Berlin, Đức",
    biography: "Du học ngành kỹ thuật phần mềm ở Đức, hiện làm việc ở Berlin.",
  },
  {
    key: "anh",
    name: "Lưu Thị Ánh",
    gender: F,
    birth: "1999",
  },
  {
    key: "linh",
    name: "Lê Thị Linh",
    gender: F,
    birth: "2001",
    occupation: "Sinh viên",
  },
  {
    key: "phong",
    name: "Lê Đình Phong",
    gender: M,
    birth: "2003",
  },
  {
    key: "trang",
    name: "Lý Thị Trang",
    gender: F,
    birth: "2005",
  },
  {
    key: "nhung",
    name: "Hồ Thị Nhung",
    gender: F,
    birth: "1979",
  },
  {
    key: "huy",
    name: "Đinh Gia Huy",
    gender: M,
    birth: "2006",
  },
  // Đời 5
  { key: "bao", name: "Lê Đình Bảo", gender: M, birth: "2010" },
  { key: "vy", name: "Lê Thị Vy", gender: F, birth: "2013" },
  { key: "ngan", name: "Mai Thị Ngân", gender: F, birth: "2009" },
  { key: "gia", name: "Lê Đình Gia", gender: M, birth: "2022" },
  { key: "an-nhien", name: "Lê Thị An Nhiên", gender: F, birth: "2024" },
];

export type FamilyParentLink = {
  parent: string;
  child: string;
  order: number;
  kind: ParentKind;
};
export const leDinhParentLinks: FamilyParentLink[] = [];
const children = (
  parents: string[],
  entries: Array<[child: string, order: number]>,
  kind: ParentKind = ParentKind.BIOLOGICAL,
) => {
  for (const parent of parents)
    for (const [child, order] of entries)
      leDinhParentLinks.push({ parent, child, order, kind });
};

children(
  ["khang", "lua"],
  [
    ["phuc", 1],
    ["mai", 2],
  ],
);
children(
  ["khang", "hien"],
  [
    ["loc", 3],
    ["tho", 4],
    ["hanh", 5],
  ],
);
children(
  ["phuc", "tam"],
  [
    ["hung", 1],
    ["lan", 2],
    ["dung", 3],
  ],
);
children(
  ["bao-nguyen", "mai"],
  [
    ["thu", 1],
    ["tai", 2],
  ],
);
children(["loc", "nga"], [["toan", 1]]);
children(["loc", "yen"], [["ngoc", 2]]);
children(["loc", "yen"], [["an", 3]], ParentKind.ADOPTIVE);
children(
  ["tho", "hoa"],
  [
    ["minh", 1],
    ["quang", 2],
    ["thao", 3],
  ],
);
children(
  ["kien", "hanh"],
  [
    ["ha", 1],
    ["long", 2],
  ],
);
children(
  ["hung", "dung-phan"],
  [
    ["tuan", 1],
    ["huong", 2],
  ],
);
children(["hai", "lan"], [["duc", 1]]);
children(["lam", "thu"], [["nhung", 1]]);
children(["toan", "lien"], [["khoi", 1]]);
children(
  ["minh", "thuy"],
  [
    ["nam", 1],
    ["linh", 2],
  ],
);
children(["quang", "van"], [["phong", 1]]);
children(["thang", "thao"], [["trang", 1]]);
children(["long", "xuan"], [["huy", 1]]);
children(
  ["tuan", "diep"],
  [
    ["bao", 1],
    ["vy", 2],
  ],
);
children(["tri", "huong"], [["ngan", 1]]);
children(["khoi", "my"], [["gia", 1]]);
children(["nam", "anh"], [["an-nhien", 1]]);

export type FamilySpouseLink = {
  first: string;
  second: string;
  status?: MarriageStatus;
  order?: number;
  startYear?: number;
  endYear?: number;
};
export const leDinhSpouseLinks: FamilySpouseLink[] = [
  {
    first: "khang",
    second: "lua",
    status: MarriageStatus.WIDOWED,
    order: 1,
    startYear: 1926,
    endYear: 1940,
  },
  {
    first: "khang",
    second: "hien",
    status: MarriageStatus.WIDOWED,
    order: 2,
    startYear: 1941,
  },
  { first: "phuc", second: "tam", startYear: 1950 },
  { first: "mai", second: "bao-nguyen", startYear: 1954 },
  {
    first: "loc",
    second: "nga",
    status: MarriageStatus.DIVORCED,
    order: 1,
    startYear: 1966,
    endYear: 1975,
  },
  { first: "loc", second: "yen", order: 2, startYear: 1978 },
  { first: "tho", second: "hoa", startYear: 1970 },
  { first: "hanh", second: "kien", startYear: 1973 },
  { first: "hung", second: "dung-phan", startYear: 1978 },
  { first: "lan", second: "hai", startYear: 1980 },
  { first: "thu", second: "lam", startYear: 1977 },
  { first: "toan", second: "lien", startYear: 1993 },
  { first: "minh", second: "thuy", startYear: 1996 },
  { first: "quang", second: "van", startYear: 2001 },
  { first: "thao", second: "thang", startYear: 2003 },
  { first: "long", second: "xuan", startYear: 2004 },
  { first: "tuan", second: "diep", startYear: 2008 },
  { first: "huong", second: "tri", startYear: 2007 },
  { first: "khoi", second: "my", startYear: 2020 },
  { first: "nam", second: "anh", startYear: 2023 },
];

/** Tài khoản demo gắn với Person, dùng để hỏi chatbot "tôi là ai". Mật khẩu chung với seed. */
export const leDinhAccounts = [
  { email: "minh@example.com", person: "minh" },
  { email: "nam@example.com", person: "nam" },
];

export const leDinhPersonId = (key: string) => `seed-le-${key}`;
const yearDate = (year: number) => new Date(Date.UTC(year, 0, 1));

export function parseSeedDate(value: string | undefined) {
  if (!value) return { date: null, precision: null };
  if (/^\d{4}$/.test(value))
    return { date: yearDate(Number(value)), precision: DatePrecision.YEAR };
  return {
    date: new Date(`${value}T00:00:00.000Z`),
    precision: DatePrecision.DAY,
  };
}

/** Dữ liệu Person dạng Prisma, dùng chung cho seed và test của module `ai`. */
export function leDinhPersonData(person: FamilySeedPerson) {
  const birth = parseSeedDate(person.birth);
  const death = parseSeedDate(person.death);
  return {
    fullName: person.name,
    aliases: person.aliases ?? [],
    gender: person.gender,
    birthDate: birth.date,
    birthDatePrecision: birth.precision,
    isDeceased: Boolean(person.death),
    deathDate: death.date,
    deathDatePrecision: death.precision,
    occupation: person.occupation ?? null,
    hometown: person.hometown ?? null,
    currentResidence: person.currentResidence ?? null,
    burialPlace: person.burialPlace ?? null,
    biography: person.biography ?? null,
  };
}

export function leDinhSpouseData(link: FamilySpouseLink) {
  return {
    marriageStatus: link.status ?? MarriageStatus.MARRIED,
    marriageOrder: link.order ?? 1,
    startedAt: link.startYear ? yearDate(link.startYear) : null,
    startedAtPrecision: link.startYear ? DatePrecision.YEAR : null,
    endedAt: link.endYear ? yearDate(link.endYear) : null,
    endedAtPrecision: link.endYear ? DatePrecision.YEAR : null,
  };
}

export async function seedLeDinhFamily(
  prisma: PrismaClient,
  adminId: string,
  passwordHash: string,
) {
  validateParentRelationships(
    leDinhParentLinks.map((link) => ({
      fromPersonId: leDinhPersonId(link.parent),
      toPersonId: leDinhPersonId(link.child),
      parentKind: link.kind,
    })),
  );
  const treeId = LE_DINH_TREE_ID;
  await prisma.familyTree.upsert({
    where: { id: treeId },
    update: { createdById: adminId },
    create: {
      id: treeId,
      name: "Họ Lê Đình – làng An Phú",
      description:
        "Gia phả mẫu (hư cấu) năm đời, từ cụ đồ Lê Đình Khang. Dùng để demo và đánh giá chatbot.",
      originPlace: HOMETOWN,
      createdById: adminId,
    },
  });
  await prisma.membership.upsert({
    where: { treeId_userId: { treeId, userId: adminId } },
    update: { role: "ADMIN" },
    create: { treeId, userId: adminId, role: "ADMIN" },
  });
  for (const person of leDinhPeople) {
    const id = leDinhPersonId(person.key);
    const data = leDinhPersonData(person);
    await prisma.person.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
    await prisma.familyTreePerson.upsert({
      where: { treeId_personId: { treeId, personId: id } },
      update: {},
      create: { treeId, personId: id },
    });
  }
  for (const link of leDinhParentLinks) {
    const id = `seed-le-rel-parent-${link.parent}-${link.child}`;
    const data = { parentKind: link.kind, birthOrder: link.order };
    await prisma.relationship.upsert({
      where: { id },
      update: data,
      create: {
        id,
        treeId,
        typeCode: "PARENT_CHILD",
        fromPersonId: leDinhPersonId(link.parent),
        toPersonId: leDinhPersonId(link.child),
        ...data,
      },
    });
  }
  for (const link of leDinhSpouseLinks) {
    const [from, to] = canonicalSpousePair(
      leDinhPersonId(link.first),
      leDinhPersonId(link.second),
    );
    const id = `seed-le-rel-spouse-${[link.first, link.second].sort().join("-")}`;
    const data = leDinhSpouseData(link);
    await prisma.relationship.upsert({
      where: { id },
      update: data,
      create: {
        id,
        treeId,
        typeCode: "SPOUSE",
        fromPersonId: from,
        toPersonId: to,
        ...data,
      },
    });
  }
  for (const account of leDinhAccounts) {
    const person = leDinhPeople.find((p) => p.key === account.person)!;
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: person.name, passwordHash, emailVerifiedAt: new Date() },
      create: {
        id: `seed-user-le-${person.key}`,
        email: account.email,
        name: person.name,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    const personId = leDinhPersonId(person.key);
    await prisma.membership.upsert({
      where: { treeId_userId: { treeId, userId: user.id } },
      update: { role: "VIEWER", personId },
      create: { treeId, userId: user.id, role: "VIEWER", personId },
    });
  }
}
