import {
  LE_DINH_TREE_ID,
  leDinhParentLinks,
  leDinhPeople,
  leDinhPersonData,
  leDinhPersonId,
  leDinhSpouseData,
  leDinhSpouseLinks,
} from "../../../../prisma/seed-data/le-dinh-family.js";
import { canonicalSpousePair } from "../../trees/relationship-validation.js";
import type { AskContext, TreeSnapshot } from "../tree-snapshot.js";

/** Dòng họ mẫu Lê Đình dựng thẳng từ dữ liệu seed, không cần DB. Dùng cho test của module `ai`. */
export function leDinhSnapshot(): TreeSnapshot {
  return {
    treeId: LE_DINH_TREE_ID,
    treeName: "Họ Lê Đình – làng An Phú",
    persons: leDinhPeople.map((person) => ({
      id: leDinhPersonId(person.key),
      preferredName: null,
      ...leDinhPersonData(person),
    })),
    relationships: [
      ...leDinhParentLinks.map((link) => ({
        typeCode: "PARENT_CHILD",
        fromPersonId: leDinhPersonId(link.parent),
        toPersonId: leDinhPersonId(link.child),
        parentKind: link.kind,
        birthOrder: link.order,
        marriageStatus: null,
        marriageOrder: null,
      })),
      ...leDinhSpouseLinks.map((link) => {
        const [from, to] = canonicalSpousePair(
          leDinhPersonId(link.first),
          leDinhPersonId(link.second),
        );
        const data = leDinhSpouseData(link);
        return {
          typeCode: "SPOUSE",
          fromPersonId: from,
          toPersonId: to,
          parentKind: null,
          birthOrder: null,
          marriageStatus: data.marriageStatus,
          marriageOrder: data.marriageOrder,
        };
      }),
    ],
  };
}

export const askAs = (personKey: string | null): AskContext => ({
  treeId: LE_DINH_TREE_ID,
  userId: "test-user",
  mePersonId: personKey ? leDinhPersonId(personKey) : null,
});

export const pid = leDinhPersonId;
