# 06 — DeFi risk agent

A local page. Paste a Base address. The assistant calls four read-only tools, then writes a short note from those results: what the address holds, how concentrated it is, and what is worth watching.

## Why this one

Remote AI-plus-crypto roles want an agent that calls tools and reads on-chain data. They do not want a chatbot that invents a balance. This assistant has no key and cannot send a transaction. The note can only use numbers the tools returned.

## Page

http://localhost:5178

From the portfolio folder, run `.\start-local-pages.ps1`, or from this folder run `npm install` and then `npm run dev`.

Try the sample wallet, then the empty wallet. The dollar figure for ETH comes from the same Chainlink feed as the price oracle.

## Stack

TypeScript, viem, a fixed tool list, Base mainnet.

## Done when

- The assistant can only call `eth_balance`, `usdc_balance`, `eth_price`, and `account_kind`.
- Balances and the ETH price come from Base, not from a guess.
- The note is readable by a person who does not write Solidity.
- No API key and no private key are required.
