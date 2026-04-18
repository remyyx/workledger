# AUSTRAC — Compliance Reference for StudioLedger

Quick reference for AUSTRAC rules, obligations, and timelines relevant to StudioLedger as a Virtual Asset Service Provider (VASP) under the AML/CTF Amendment Act 2024 (Tranche 2).

Last updated: March 2026

---

## Timeline

| Date | Event |
|------|-------|
| 31 March 2026 | Tranche 2 enrolment portal opens. Can enrol and apply for registration from this date. |
| 31 March 2026 | Criminal penalties apply for providing virtual asset services without registration. |
| 1 July 2026 | AML/CTF obligations commence for Tranche 2 entities. Travel Rule enforcement begins. |
| 29 July 2026 | Hard deadline for enrolment and registration (28 days after obligations commence). |
| 30 March 2029 | End of 3-year initial CDD transition period for existing reporting entities. |

Important: obligations only matter when processing real transactions. The platform does not need to be live by July 1. Enrol, get the program signed off, launch when ready.

---

## Classification

StudioLedger is classified as a Virtual Asset Service Provider (VASP) — specifically a Cryptocurrency Exchange / Transfer Facilitator under AUSTRAC's regulatory framework.

Why: the platform facilitates escrow-protected transfers of RLUSD (a virtual asset) between parties, holds constructive custody of escrow fulfillment keys, and manages platform wallets on behalf of users.

---

## Enrolment & Registration

Two separate steps, recommended to do simultaneously:

1. Enrolment — create an AUSTRAC user account, fill in the AUSTRAC Business Profile Form (ABPF). Can save progress and return within 14 days.
2. Registration — apply for VASP registration. Cannot provide designated services until AUSTRAC approves registration. Criminal penalties for operating without registration from 31 March 2026.

Portal: https://www.austrac.gov.au/business/new-to-austrac/enrol-or-register

---

## AML/CTF Program Requirements

Must be a written document. Two parts:

### Part A — Governance & Risk

- ML/TF/PF risk assessment (reviewed annually or on material change)
- Board / senior management approval and ongoing oversight
- AML/CTF compliance officer appointment (management level, fit and proper person — explicit requirement from 31 March 2026)
- Employee due diligence program
- AML/CTF risk awareness training program for all employees
- Independent evaluation at least once every 3 years

### Part B — Customer Due Diligence (KYC)

- Identify and verify every customer before providing any designated service
- Collect: full name, date of birth, residential address, ID document details
- Verify: against reliable, independent source (government-issued ID)
- Enhanced CDD for higher-risk customers (PEPs, high-value transactions, sanctioned country links)
- Ongoing CDD throughout the customer relationship
- Transaction monitoring program

StudioLedger's planned KYC tiers:
- Basic KYC (ID + selfie): AUD 10,000 per contract
- Enhanced KYC (proof of address + source of funds): AUD 50,000 per contract

---

## Travel Rule

Applies to all virtual asset transfers from 1 July 2026. No minimum threshold — every transfer regardless of amount.

### Information required for every transfer

Originator (payer):
- Full name
- Account number or virtual asset wallet address
- Physical address, or date and place of birth, or national identity number

Beneficiary (payee):
- Full name
- Account number or virtual asset wallet address

### Institutional roles

- Ordering institution — accepts the transfer instruction from the payer (StudioLedger when a marketmaker funds escrow)
- Beneficiary institution — provides the payee with transferred value (StudioLedger when releasing escrow to creator)
- Intermediary institution — receives and passes on transfer messages (not applicable to StudioLedger's model)

### StudioLedger context

StudioLedger acts as both ordering and beneficiary institution since escrow is created and released on the same platform. All originator/beneficiary information is already collected during KYC. The travel rule is inherently satisfied for on-platform transactions. Cross-platform transfers (user withdraws to external wallet) require full travel rule compliance.

---

## Reporting Obligations

### Suspicious Matter Reports (SMRs)

Must report to AUSTRAC if you suspect or have reasonable grounds to suspect that a customer or transaction is related to money laundering, terrorism financing, or other serious crime. Must file within:
- 24 hours — if relates to terrorism financing
- 3 business days — all other suspicious matters

Tipping off (telling the customer about the SMR) is a criminal offence.

### Threshold Transaction Reports (TTRs)

Any cash transaction of AUD 10,000 or more (or foreign equivalent) must be reported within 10 business days. StudioLedger operates primarily in digital currency, but any fiat on-ramp/off-ramp meeting the threshold triggers this obligation.

### International Funds Transfer Instructions (IFTIs)

Cross-border transfers must be reported. Under the reformed Act, virtual asset transfers with a cross-border element are subject to IFTI reporting obligations.

---

## Record Keeping

- Customer identification records: minimum 7 years after relationship ends
- Transaction records: minimum 7 years after the transaction
- AML/CTF program: retain current and all previous versions
- SMRs: retain records of all reports filed
- Training records: retain evidence of employee training

---

## Sanctions Screening

Dual exposure for StudioLedger:

- DFAT Consolidated List (Australia) — AUSTRAC obligation, all users and transactions
- OFAC SDN List (United States) — via RLUSD, a US-regulated stablecoin issued by Ripple under NYDFS trust charter

Must screen:
- At onboarding (all users)
- At each transaction
- On updated sanctions lists (continuous monitoring recommended)

Providers shortlisted: Chainalysis, Elliptic, ComplyAdvantage.

---

## Penalties for Non-Compliance

### Criminal

- Providing designated services without registration from 31 March 2026
- Tipping off a customer about an SMR filing
- Structuring transactions to avoid reporting thresholds

### Civil

- Up to AUD 22.2 million per contravention for serious breaches
- AUSTRAC can cancel or suspend VASP registration
- Enforceable undertakings
- Infringement notices
- Civil penalty proceedings

### Recent enforcement examples

AUSTRAC has launched civil penalty proceedings against entities for missed compliance reports and inadequate AML/CTF programs. Registration can be refused, cancelled, or suspended if the entity poses unacceptable ML/TF risk.

---

## StudioLedger-Specific Considerations

### Constructive custody

The platform holds the escrow fulfillment preimage, constituting constructive custody under AUSTRAC definitions. This classifies platform-managed wallets as custodial wallet services. Acknowledged in the AML/CTF Program.

### Platform-managed wallets

Users who sign up via Google OAuth get a platform-managed XRPL wallet. The private key is stored by the platform. This is a custodial service under AUSTRAC definitions.

### RLUSD issuer dependency

Ripple (RLUSD issuer) bears its own compliance burden under NYDFS. StudioLedger is not the issuer but depends on Ripple's regulatory standing. Issuer risk is disclosed in Escrow Terms.

### Fee model

0.98% per escrow release. Not classified as a financial product fee — it's a service fee for transaction facilitation. GST treatment: input-taxed financial supply (AU residents) or GST-free (non-residents).

---

## Key AUSTRAC Links

- Enrolment portal: https://www.austrac.gov.au/business/new-to-austrac/enrol-or-register
- VASP registration: https://www.austrac.gov.au/amlctf-reform/reforms-guidance/before-you-start/find-out-when-enrol-and-register-reform/register-us-remittance-or-virtual-asset-service-provider-reform
- Tranche 2 obligations summary: https://www.austrac.gov.au/about-us/amlctf-reform/summary-amlctf-obligations-tranche-2-entities
- Travel Rule overview: https://www.austrac.gov.au/amlctf-reform/reforms-guidance/other-guidance/travel-rule-reform/travel-rule-overview-reform
- Travel Rule for virtual assets: https://www.austrac.gov.au/amlctf-reform/reforms-guidance/other-guidance/travel-rule-reform/additional-travel-rule-obligations-when-transferring-virtual-assets-reform
- AML/CTF program guidance: https://www.austrac.gov.au/amlctf-reform/reforms-guidance/amlctf-program-reform/develop-your-amlctf-program-reform
- Customer due diligence: https://www.austrac.gov.au/amlctf-reform/reforms-guidance/amlctf-program-reform/customer-due-diligence-reform/overview-customer-due-diligence-reform
- Enhanced CDD: https://www.austrac.gov.au/amlctf-reform/reforms-guidance/amlctf-program-reform/customer-due-diligence-reform/enhanced-customer-due-diligence-reform
- VASP risk insights: https://www.austrac.gov.au/business/how-comply-guidance-and-resources/guidance-resources/risk-insights-virtual-asset-service-providers
- Penalties: https://www.austrac.gov.au/business/core-guidance/consequences-not-complying
- Reform overview: https://www.austrac.gov.au/amlctf-reform

---

StudioLedger Pty Ltd | ACN 696 549 809 | ABN 31 696 549 809
