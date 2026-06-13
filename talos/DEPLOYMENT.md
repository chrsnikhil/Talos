# Talos — Deployment Record

## Sui Testnet

| Item | Value |
| --- | --- |
| **Package ID** | `0x879f93fde0c8797aa4e6d2d07263d796a0a568953503bd3c695001493a554eca` |
| Module | `agent_policy` |
| UpgradeCap | `0x7620cc9442c1da117e385c9cb952ea835cb518530cbfa1fc52eb3ba3446af1f5` |
| Deployer / owner | `0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f` |
| Network | Sui Testnet (`https://fullnode.testnet.sui.io:443`) |

> Mainnet redeploy is planned for the hackathon submission; the package ID above is the testnet proof.

## Live demo of the on-chain leash

Agent and owner are the same address for the demo (single keypair). Sequence proven on-chain:

| # | Action | Tx digest | Result |
| --- | --- | --- | --- |
| 1 | `create_policy_entry` (budget 1000, per-tx 500, protocols [suilend, scallop]) | `C5ccRnqj3ZRJRdyf86ZppbUnjpGWJKCkLgAo974VRVU4` | AgentPolicy `0xca95557c157ed9f6cbdb880357fe70945e1a7103ec28f25b5d8473d4c369e03f` (shared), OwnerCap `0xdeaa58bf0e7e5d8a38ff3a4c41c435caf72b9c50847b0875decc8aff65c69d63` |
| 2 | `authorize_spend` 300 / suilend | `9jT3dDHXyzi3Y6b7NTXCnZqoq2qEMGpwaMBAQb4hEKxg` | ✅ success — remaining 1000 → 700, total_spent 300 |
| 3 | `revoke` (OwnerCap) | `4LS8SQLuiNXKEx8beVKEyAC74rW6kDE6f68bzQdeDoD6` | ✅ success — `revoked = true` |
| 4 | `authorize_spend` 100 / suilend (after revoke) | — | ❌ **aborted on-chain in `agent_policy::authorize_spend` with code 1 (`ERevoked`)** |

This demonstrates all four Agentic Web Sub-track 2 must-haves at the contract level: self-enforced budget ceiling, protocol scope, an on-chain activity log (events), and demonstrable owner revocation enforced by the chain.

## Reproduce

```bash
cd talos
sui move test                 # 8/8 unit tests
sui client publish --gas-budget 200000000
# then call create_policy_entry / authorize_spend / revoke as above
```
