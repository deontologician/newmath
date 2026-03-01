{
  description = "newmath – TypeScript + Vite + MiniZinc/HiGHS";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    claude-code.url = "github:sadjow/claude-code-nix";
  };

  outputs = { self, nixpkgs, flake-utils, claude-code }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            # Editor / AI
            claude-code.packages.${system}.claude-code

            # Node / TypeScript / Vite
            pkgs.nodejs_22
            pkgs.corepack_22

            # MiniZinc + HiGHS solver
            pkgs.minizinc
            pkgs.highs
          ];

          shellHook = ''
            # MiniZinc loads HiGHS as a dynamic plugin (libhighs.so).
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ pkgs.highs ]}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
          '';
        };
      });
}
