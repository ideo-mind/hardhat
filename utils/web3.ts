import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ethers } from "ethers"
import { Account } from "./types"

/**
 * Connect to ERC20 contract by address
 */
export async function connectERC(
  hre: HardhatRuntimeEnvironment,
  address: string
) {
  return connectContractAddress(hre, "ERC20", address)
}

/**
 * Connect to MoneyPot contract (adapted for ignition)
 */
export async function connectMoneyPot(hre: HardhatRuntimeEnvironment) {
  // Try to get from ignition deployments first
  try {
    const deployments = await hre.ignition.getDeployedContracts()
    const moneyPotDeployment = deployments.find((d) => d.id === "MoneyPot")
    if (moneyPotDeployment) {
      return connectContractAddress(hre, "MoneyPot", moneyPotDeployment.address)
    }
  } catch (error) {
    console.log("No ignition deployment found, using contract factory")
  }

  // Fallback to contract factory
  const factory = await hre.ethers.getContractFactory("MoneyPot")
  return factory
}

/**
 * Connect to contract by address using ethers v6
 */
export async function connectContractAddress<T extends any>(
  hre: HardhatRuntimeEnvironment,
  name: string,
  address: string
): Promise<T> {
  const factory = await hre.ethers.getContractFactory(name)
  const contract = factory.attach(address) as unknown as T
  return contract
}

/**
 * Get contract instance from deployment artifacts
 */
export async function getDeployedContract(
  hre: HardhatRuntimeEnvironment,
  contractName: string
) {
  try {
    // Try ignition deployments first
    const deployments = await hre.ignition.getDeployedContracts()
    const deployment = deployments.find((d) => d.id === contractName)
    if (deployment) {
      return connectContractAddress(hre, contractName, deployment.address)
    }
  } catch (error) {
    console.log(`No ignition deployment found for ${contractName}`)
  }

  // Fallback to contract factory
  const factory = await hre.ethers.getContractFactory(contractName)
  return factory
}

/**
 * Get signer for account
 */
export async function getSigner(
  hre: HardhatRuntimeEnvironment,
  account: Account
) {
  return await hre.ethers.getSigner(account.address!)
}

/**
 * Get signer by address
 */
export async function getSignerByAddress(
  hre: HardhatRuntimeEnvironment,
  address: string
) {
  return await hre.ethers.getSigner(address)
}
