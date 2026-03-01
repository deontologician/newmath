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
  diversity: {
    description: "Every symbol appears as an output somewhere in the table",
    mzn: "constraint forall(v in S)( exists(a,b in S)( op[a,b] = v ));",
  },
  idempotent: {
    description: "For all a: a*a = a",
    mzn: "constraint forall(a in S)( op[a,a] = a );",
  },
  medial: {
    description: "For all a,b,c,d: (a*b)*(c*d) = (a*c)*(b*d)",
    mzn: "constraint forall(a,b,c,d in S)( op[op[a,b],op[c,d]] = op[op[a,c],op[b,d]] );",
  },
  leftDistributive: {
    description: "For all a,b,c: a*(b*c) = (a*b)*(a*c)",
    mzn: "constraint forall(a,b,c in S)( op[a,op[b,c]] = op[op[a,b],op[a,c]] );",
  },
  rightDistributive: {
    description: "For all a,b,c: (b*c)*a = (b*a)*(c*a)",
    mzn: "constraint forall(a,b,c in S)( op[op[b,c],a] = op[op[b,a],op[c,a]] );",
  },
  leftCancellative: {
    description: "For all a,b,c: a*b = a*c implies b = c",
    mzn: "constraint forall(a,b,c in S)( op[a,b] = op[a,c] -> b = c );",
  },
  rightCancellative: {
    description: "For all a,b,c: b*a = c*a implies b = c",
    mzn: "constraint forall(a,b,c in S)( op[b,a] = op[c,a] -> b = c );",
  },
};
