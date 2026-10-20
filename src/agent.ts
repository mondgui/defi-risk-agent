import {
  cents,
  ethValue,
  formatAmount,
  formatCents,
  formatUsd,
  parseAddress,
  readEth,
  readEthPrice,
  readKind,
  readUsdc,
  usdcValue,
  type Facts,
} from "./chain";

export type Step = {
  tool: string;
  detail: string;
};

export type Report = {
  steps: Step[];
  note: string;
};

const TOOLS = ["eth_balance", "usdc_balance", "eth_price", "account_kind"] as const;

type ToolName = (typeof TOOLS)[number];

export async function explainWallet(input: string, onStep?: (step: Step) => void): Promise<Report> {
  const address = parseAddress(input);
  const facts: Facts = {
    address,
    eth: 0n,
    usdc: 0n,
    ethPrice: 0n,
    priceFresh: false,
    isContract: false,
  };
  const steps: Step[] = [];

  for (const tool of TOOLS) {
    const step = await callTool(tool, facts);
    steps.push(step);
    onStep?.(step);
  }

  return { steps, note: writeNote(facts) };
}

async function callTool(tool: ToolName, facts: Facts): Promise<Step> {
  if (tool === "eth_balance") {
    facts.eth = await readEth(facts.address);
    return { tool, detail: `${formatAmount(facts.eth, 18)} ETH` };
  }
  if (tool === "usdc_balance") {
    facts.usdc = await readUsdc(facts.address);
    return { tool, detail: `${formatCents(cents(usdcValue(facts.usdc))).slice(1)} USDC` };
  }
  if (tool === "eth_price") {
    const price = await readEthPrice();
    facts.ethPrice = price.price;
    facts.priceFresh = price.fresh;
    const label = price.fresh ? "fresh" : "stale";
    return { tool, detail: `${formatUsd(price.price)} per ETH, ${label}` };
  }
  facts.isContract = await readKind(facts.address);
  return { tool, detail: facts.isContract ? "contract" : "wallet" };
}

export function writeNote(facts: Facts): string {
  const ethUsd = ethValue(facts.eth, facts.ethPrice);
  const stableUsd = usdcValue(facts.usdc);
  const ethCents = cents(ethUsd);
  const stableCents = cents(stableUsd);
  const totalCents = ethCents + stableCents;
  const who = facts.isContract
    ? "This address is a contract, not a person's wallet."
    : "This is a normal wallet.";

  if (totalCents === 0n) {
    return `${who} It holds no ETH and no USDC on Base. There is nothing here to lose until someone sends funds.`;
  }

  const holds = `It holds ${formatAmount(facts.eth, 18)} ETH (about ${formatCents(ethCents)}) and ${formatCents(stableCents).slice(1)} USDC. Together that is about ${formatCents(totalCents)}.`;
  const ethShare = Number((ethCents * 100n) / totalCents);
  const mix =
    ethShare >= 80
      ? "Almost all of that value is ETH."
      : ethShare <= 20
        ? "Almost all of that value is USDC."
        : "The value is split between ETH and USDC.";

  let watch: string;
  if (!facts.priceFresh && ethCents > 0n) {
    watch = "The ETH dollar figure is older than Chainlink's 20-minute heartbeat, so do not treat it as the current price.";
  } else if (ethShare >= 80) {
    watch = "The part to watch is the ETH price. USDC is a dollar token, so its count barely moves.";
  } else if (ethShare <= 20) {
    watch = "The part to watch is who holds the key. USDC is meant to stay near one dollar, but the key can move it.";
  } else {
    watch = "Watch both the ETH price and who holds the key. One part moves with the market, the other does not.";
  }

  const contract = facts.isContract ? " Sending funds here does not mean a person received them." : "";
  return `${who} ${holds} ${mix} ${watch}${contract}`;
}
