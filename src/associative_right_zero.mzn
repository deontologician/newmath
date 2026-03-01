% Find an associative binary operation on 3 symbols
% where at least one symbol is a right-zero but NOT a left-zero.
%
% Right-zero z:  for all a, a * z = z
% "Only":        z is NOT also a left-zero (exists a : z * a != z)

int: n = 3;
set of int: S = 1..n;

% Operation table: op[a,b] represents a * b
array[S, S] of var S: op;

% --- Associativity ---
constraint forall(a in S, b in S, c in S)(
    op[op[a, b], c] = op[a, op[b, c]]
);

% --- At least one right-zero-only element (existentially quantified) ---
constraint exists(rz in S)(
    forall(a in S)( op[a, rz] = rz )     % rz is a right-zero
    /\ exists(a in S)( op[rz, a] != rz ) % rz is NOT a left-zero
);

solve satisfy;

output [
    "Operation table (row * col):\n",
    "  * | " ++ join("  ", [show(j) | j in S]) ++ "\n",
    " ---+--------\n"
] ++ [
    "  \(i) | " ++ join("  ", [show(op[i, j]) | j in S]) ++ "\n"
    | i in S
] ++ [
    "\nAll pairs:\n"
] ++ [
    "  \(i) * \(j) = \(op[i, j])\n"
    | i in S, j in S
];
