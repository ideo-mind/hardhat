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
  NETWORK={{network}} bun hardhat ignition deploy ignition/modules/MoneyPot.ts --reset --network {{network}} --parameters ignition/parameters/{{network}}.json {{ARGS}}


hardhat *ARGS:
  bun hardhat {{ARGS}}

bun *ARGS:
  bun {{ARGS}}