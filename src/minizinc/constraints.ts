import type { ConstraintName } from "./schema.ts";

export interface ConstraintEntry {
  description: string;
  mzn: string;
}

export const constraintRegistry: Record<ConstraintName, ConstraintEntry> = {
  associativity: {
    description: "For all a, b, c: (a*b)*c = a*(b*c)",
    mzn: "constraint forall(a,b,c in S)( op[op[a,b],c] = op[a,op[b,c]] );",
  },
  commutativity: {
    description: "For all a, b: a*b = b*a",
    mzn: "constraint forall(a,b in S)( op[a,b] = op[b,a] );",
  },
  leftIdentity: {
    description: "There exists e such that for all a: e*a = a",
    mzn: "constraint exists(e in S)( forall(a in S)( op[e,a] = a ));",
  },
  rightIdentity: {
    description: "There exists e such that for all a: a*e = a",
    mzn: "constraint exists(e in S)( forall(a in S)( op[a,e] = a ));",
  },
  leftZero: {
    description: "There exists z such that for all a: z*a = z",
    mzn: "constraint exists(z in S)( forall(a in S)( op[z,a] = z ));",
  },
  rightZero: {
    description: "There exists z such that for all a: a*z = z",
    mzn: "constraint exists(z in S)( forall(a in S)( op[a,z] = z ));",
  },
};
