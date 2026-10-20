import { createPublicClient, formatUnits, getAddress, http, isAddress, type Address } from "viem";
import { base } from "viem/chains";

const BASE_RPC = "https://base-rpc.publicnode.com";

export const SAMPLE_WALLET = "0xf5c4f3dc02c3fb9279495a8fef7b0741da956157";
export const EMPTY_WALLET = "0x333234026fde62aed7f75bb713baa38307df5bc1";

const USDC: Address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ETH_USD: Address = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
const HEARTBEAT_SECONDS = 20 * 60;

const usdcAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const priceAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

const client = createPublicClient({
  chain: base,
  transport: http(BASE_RPC, { timeout: 20_000 }),
});

export type Facts = {
  address: Address;
  eth: bigint;
  usdc: bigint;
  ethPrice: bigint;
  priceFresh: boolean;
  isContract: boolean;
};

export function parseAddress(input: string): Address {
  const trimmed = input.trim();
  if (!isAddress(trimmed)) {
    throw new Error("That is not an address. Paste the full 0x address, 42 characters.");
  }
  return getAddress(trimmed);
}

export async function readEth(address: Address): Promise<bigint> {
  return client.getBalance({ address });
}

export async function readUsdc(address: Address): Promise<bigint> {
  return client.readContract({
    address: USDC,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [address],
  });
}

export async function readEthPrice(): Promise<{ price: bigint; fresh: boolean }> {
  const [round, block] = await Promise.all([
    client.readContract({ address: ETH_USD, abi: priceAbi, functionName: "latestRoundData" }),
    client.getBlock(),
  ]);
  const [roundId, answer, , updatedAt, answeredInRound] = round;
  const age = Number(block.timestamp - updatedAt);
  const fresh = answer > 0n && updatedAt > 0n && answeredInRound >= roundId && age <= HEARTBEAT_SECONDS;
  return { price: answer > 0n ? answer : 0n, fresh };
}

export async function readKind(address: Address): Promise<boolean> {
  const code = await client.getCode({ address });
  return Boolean(code && code !== "0x");
}

export function formatAmount(value: bigint, decimals: number, places = 4): string {
  const text = formatUnits(value, decimals);
  const [whole, fraction = ""] = text.split(".");
  const trimmed = fraction.slice(0, places).replace(/0+$/, "");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

export function cents(value8: bigint): bigint {
  return (value8 + 500_000n) / 1_000_000n;
}

export function formatUsd(value8: bigint): string {
  return formatCents(cents(value8));
}

export function formatCents(centsValue: bigint): string {
  const whole = centsValue / 100n;
  const frac = (centsValue % 100n).toString().padStart(2, "0");
  return `$${whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac}`;
}

export function ethValue(eth: bigint, price8: bigint): bigint {
  return (eth * price8) / 10n ** 18n;
}

export function usdcValue(usdc: bigint): bigint {
  return usdc * 100n;
}
