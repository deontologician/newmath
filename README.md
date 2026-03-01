## New Math

Try it out here: https://deontologician.github.io/newmath/

<img width="2453" height="1288" alt="image" src="https://github.com/user-attachments/assets/4d6b9753-bd35-4f58-93eb-ce525599e564" />

This is a brower based webapp that lets you build and discover your own math.

The idea is that you're building an algebraic structure called a [magma](https://en.wikipedia.org/wiki/Magma_(algebra)).
A magma is just a binary operation, and a set that the operation acts on.

This tool lets you explore and build new magmas with whatever constraints you want.

Under the hood, it uses [minizinc](https://www.minizinc.org/) to find operations that satisfy the constraints you provide.

## Developing

use `nix develop` to get a shell with all of the required tools available

