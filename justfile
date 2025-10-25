set shell := ["sh", "-c"]
set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
#set allow-duplicate-recipe
#set positional-arguments
set dotenv-filename := ".env"
set export

import? "local.justfile"

NETWORK := env("NETWORK")

start *ARGS: 
  bun start {{ARGS}}


deploy network=NETWORK *ARGS="":
  bun hardhat ignition deploy ignition/modules/MoneyPot.ts --network {{network}} --parameters ignition/parameters/{{network}}.json {{ARGS}}


hardhat *ARGS:
  bun hardhat {{ARGS}}