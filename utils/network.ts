import { HardhatRuntimeEnvironment } from "hardhat/types"

/**
 * Get current network information
 */
export const getNetwork = (hre: HardhatRuntimeEnvironment) => {
  const network = hre.network
  return network
}

/**
 * Get list of available networks, optionally filtered
 */
export const getNetworks = (
  hre: HardhatRuntimeEnvironment,
  filteredNetworks: Array<string> = ["localhost"]
) => {
  filteredNetworks = filteredNetworks ?? []

  let networkNames = Object.keys(hre.config.networks)
  networkNames = networkNames.filter(
    (network: string) => !filteredNetworks.includes(network)
  )
  return networkNames
}

/**
 * Check if network is a testnet
 */
export function isTestnet(networkName: string): boolean {
  const testnets = [
    "sepolia",
    "goerli",
    "hardhat",
    "localhost",
    "base-sepolia",
    "arbitrum-sepolia",
    "optimism-sepolia",
    "polygon-amoy",
  ]
  return testnets.includes(networkName.toLowerCase())
}

/**
 * Check if network is local
 */
export function isLocalNetwork(networkName: string): boolean {
  return ["hardhat", "localhost"].includes(networkName.toLowerCase())
}

/**
 * Get block confirmations for network
 */
export function getConfirmations(networkName: string): number {
  const network = hre.config.networks[networkName]
  return network?.confirmations || (isLocalNetwork(networkName) ? 1 : 2)
}

/**
 * Log network information
 */
export function logNetworkInfo(
  networkName: string,
  hre: HardhatRuntimeEnvironment
): void {
  const network = hre.config.networks[networkName]
  console.log(`\n🌐 Network: ${networkName}`)
  console.log(`   Chain ID: ${network?.chainId || "Unknown"}`)
  console.log(`   RPC URL: ${network?.url || "Unknown"}`)
  if (network?.ws) {
    console.log(`   WebSocket: ${network.ws}`)
  }
  if (network?.explorer) {
    console.log(`   Explorer: ${network.explorer}`)
  }
  if (network?.faucet) {
    const faucets = Array.isArray(network.faucet)
      ? network.faucet
      : [network.faucet]
    console.log(`   Faucets:`)
    faucets.forEach((f) => console.log(`     - ${f}`))
  }
  console.log("")
}
