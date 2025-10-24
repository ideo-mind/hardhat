set shell := ["sh", "-c"]
set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
#set allow-duplicate-recipe
#set positional-arguments
set dotenv-filename := ".env"
set export

import? "local.justfile"

start *ARGS: 
  bun start {{ARGS}}


deploy-localhost:
  bun hardhat ignition deploy ignition/modules/MoneyPot.ts --network localhost --parameters ignition/parameters/localhost.json
