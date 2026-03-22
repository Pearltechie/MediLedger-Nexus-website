# 🏥 MediLedger Nexus

### *"The Body is the Key. The Ledger is the Truth."*

> A Web3-powered medical data infrastructure that encrypts, stores, and verifies patient records — making healthcare data impossible to breach, falsify, or lose.

[![Built on Hedera](https://img.shields.io/badge/Built%20on-Hedera-8B5CF6?style=for-the-badge&logo=hedera)](https://hedera.com)
[![IPFS](https://img.shields.io/badge/Storage-IPFS%20%2F%20Pinata-65C2CB?style=for-the-badge)](https://pinata.cloud)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**[🌐 Live Demo](https://medi-ledger-frontend--jehofawapelumi.replit.app)** &nbsp;·&nbsp; **[🎥 Demo Video](https://youtu.be/DSXzH3Heiig)** &nbsp;·&nbsp; **[📋 Issues](https://github.com/Pearltechie/MediLedger-Nexus-website/issues)**

---

## 📌 The Problem

Healthcare data infrastructure is broken — and people are paying for it with their lives and privacy.

- **1 in 5 patients** are misidentified at some point in their care journey, leading to wrong treatments, missed diagnoses, and preventable deaths
- Healthcare is the **most breached industry in the world** — the average cost of a single breach exceeds $10 million
- Patient records are **siloed across institutions**: a patient treated at three hospitals may have three disconnected, contradictory records with no way to verify which is accurate
- In many regions, **paper-based records** are still standard — easily lost, destroyed, or falsified

The root cause is the same everywhere: **centralized, unverified, unencrypted data storage**. The systems holding the world's most sensitive information have no tamper-proof audit trail, no cryptographic integrity check, and no resilience against failure.

---

## 💡 The Solution

**MediLedger Nexus** is a working MVP that sits as a security and verification layer over existing healthcare record workflows. Hospitals and providers remain the **owners and custodians** of their patient data — MediLedger Nexus is the infrastructure that makes that data **impossible to breach, falsify, or lose**.

It does three things no traditional EHR system does:

1. **Encrypts** every file client-side with AES-256 before it ever leaves the browser
2. **Stores** the encrypted file on IPFS — distributed, permanent, and censorship-resistant
3. **Anchors** a tamper-proof verification hash on the Hedera blockchain — so any future alteration is immediately detectable

No raw data on the ledger. No single server to attack. No way to change a record without detection.

---

## ⚙️ How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                   Healthcare Provider                        │
│                                                              │
│  Staff logs in via Web3Auth (social / email)                 │
│                          │                                   │
│                          ▼                                   │
│  Uploads patient record ───► AES-256 encrypted IN BROWSER   │
│                          │   (plaintext never leaves device) │
│                          │                                   │
│                          ▼                                   │
│  Encrypted file ─────────────────────► IPFS via Pinata      │
│                          │             Returns: CID          │
│                          │                                   │
│                          ▼                                   │
│  Hash(file) + CID ───────────────────► Hedera HCS           │
│                                        Returns: TxID         │
│                                        Immutable audit entry │
└──────────────────────────────────────────────────────────────┘
```

**Step-by-step:**

1. **Authentication** — Staff log in via Web3Auth using a social or email account. Web3Auth maps the session to a Hedera account via MPC — no wallet setup or seed phrases required.
2. **Record Upload** — A patient record (document, scan, image) is selected for upload.
3. **Client-side Encryption** — The file is encrypted with AES-256 entirely in the browser. The plaintext never touches the network.
4. **IPFS Storage** — The encrypted file is pinned to IPFS via Pinata, returning a unique content identifier (CID).
5. **Hedera Anchoring** — A message containing the file's hash and IPFS CID is submitted to an HCS topic, creating a time-stamped, immutable on-chain entry.
6. **Verification** — Any party with the CID and original file can re-hash it and compare against the HCS entry. A mismatch proves tampering. A match proves integrity.

---

## 🔗 Why Hedera?

Hedera Consensus Service was the right choice for MediLedger Nexus — not just any blockchain.

| Requirement | Why Hedera Delivers |
|---|---|
| **Immutability** | HCS messages, once written, cannot be altered or deleted — ever |
| **Ordered audit trail** | Every message is timestamped and sequenced, creating a reliable chain of custody |
| **Cost at scale** | Hedera's fees are fractions of a cent per message — viable for per-record anchoring at hospital scale |
| **Finality speed** | 3–5 second finality means staff don't wait for block confirmations during clinical workflows |
| **Energy efficiency** | Hedera is carbon-negative — important for institutions with ESG obligations |
| **Enterprise trust** | Governed by a council of global enterprises; purpose-built for institutional adoption |

Crucially, **no patient data ever touches the Hedera ledger**. Only a cryptographic hash and IPFS CID are written on-chain — giving full verifiability without exposing any sensitive information.

Transactions can be verified publicly at [HashScan Testnet Explorer](https://hashscan.io/testnet).

---

## ✨ Key Features

- 🔐 **Client-side AES-256 Encryption** — Files are encrypted in the browser before upload. Raw data is never transmitted over the network.
- 📁 **Decentralized IPFS Storage** — Encrypted records are pinned via Pinata. No central server that can be attacked or taken offline.
- ⛓️ **Hedera HCS Anchoring** — A tamper-proof hash is written on-chain per record, creating a permanent, time-stamped audit trail.
- 🔑 **Web3Auth Authentication** — Staff use familiar email or social login. No crypto wallet or seed phrase required.
- 🏛️ **Institution-Owned Records** — Hospitals remain custodians of their data. MediLedger Nexus is the infrastructure layer, not the gatekeeper.
- 🌐 **Verifiable Interoperability** — Standardized record hashes and IPFS CIDs enable cross-institution verification without sharing raw data.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite + TypeScript |
| **Authentication** | Web3Auth (Sapphire Devnet) |
| **Encryption** | AES-256 (client-side, in-browser) |
| **Decentralized Storage** | IPFS via Pinata |
| **Blockchain / Verification** | Hedera Consensus Service (HCS Testnet) |
| **Hedera SDK** | `@hashgraph/sdk` (browser-polyfilled via `vite-plugin-node-polyfills`) |
| **Monorepo** | pnpm workspaces |
| **API Layer** | Express 5 + Drizzle ORM + PostgreSQL |
| **Validation** | Zod v4 |
| **Build Tools** | Vite (frontend), esbuild (API) |

---

##  Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+ — `npm install -g pnpm`
- A [Hedera Testnet account](https://portal.hedera.com/) with an HCS topic created
- A [Pinata](https://app.pinata.cloud/) account (free tier works)
- A [Web3Auth](https://dashboard.web3auth.io/) project on Sapphire Devnet

### 1. Clone the Repository

```bash
git clone https://github.com/Pearltechie/MediLedger-Nexus-website.git
cd MediLedger-Nexus-website
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# ── Hedera Testnet ──────────────────────────────────────────
VITE_HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID     # e.g. 0.0.1234567
VITE_HEDERA_PRIVATE_KEY=your_hex_ecdsa_key      # Hex-encoded ECDSA key, no 0x prefix
VITE_HEDERA_TOPIC_ID=0.0.YOUR_TOPIC_ID         # HCS topic for record anchoring

# ── Pinata IPFS ─────────────────────────────────────────────
VITE_PINATA_JWT=your_pinata_jwt_token           # From app.pinata.cloud → API Keys

# ── Web3Auth ────────────────────────────────────────────────
VITE_WEB3AUTH_CLIENT_ID=your_web3auth_client_id # From dashboard.web3auth.io
```

> **Creating an HCS Topic:** In the [Hedera Portal](https://portal.hedera.com/), navigate to your testnet account and create a new Consensus topic. Copy the topic ID (format: `0.0.XXXXXXX`) into `VITE_HEDERA_TOPIC_ID`.

### 4. Run the Development Server

```bash
pnpm --filter @workspace/mediledger-nexus run dev
```

Visit `http://localhost:5173` in your browser.

### 5. Build for Production

```bash
pnpm run build
```

---

## 📁 Project Structure

```
MediLedger-Nexus-website/
├── artifacts/
│   └── mediledger-nexus/           # Core React frontend
│       └── src/
│           ├── components/
│           │   ├── Dashboard.tsx   # Provider dashboard — record management
│           │   └── RecordCard.tsx  # Record display with IPFS link + HCS TxID
│           └── lib/
│               ├── hedera.ts       # HCS message submission
│               └── pinata.ts       # IPFS upload + CID retrieval
├── lib/
│   ├── api-spec/                   # OpenAPI spec + Orval codegen
│   ├── api-client-react/           # Generated React Query hooks
│   ├── api-zod/                    # Generated Zod schemas
│   └── db/                         # Drizzle ORM + PostgreSQL
├── scripts/                        # Utility scripts
├── .env.example                    # Environment variable template
└── package.json
```

---

## 🔒 Security Design

| Threat | Mitigation |
|---|---|
| **Data breach via interception** | AES-256 client-side encryption — intercepted data is unreadable ciphertext |
| **Record tampering** | Hash anchored on Hedera HCS — any alteration produces a detectable mismatch |
| **Server compromise** | Encrypted files live on IPFS — no central database to attack |
| **Key and credential leakage** | Private keys never leave the browser; Web3Auth uses MPC signing |
| **Accidental secret commits** | `.env` is gitignored; `.env.example` contains only placeholder values |

---

## 🛣️ Roadmap

### Phase 2 — Identity
- [ ] **Biometric patient identity** — link records to biometric markers to eliminate misidentification at point of care
- [ ] **Hedera DIDs** — issue Hedera-native Decentralized Identifiers to patients for portable, cross-institution identity

### Phase 3 — Access & Interoperability
- [ ] **Granular access control** — institutions grant and revoke provider access to specific records via Hedera token gating
- [ ] **Cross-institution record sharing** — verified record transfer between hospitals using shared HCS topics
- [ ] **HL7 FHIR compatibility** — align the record format with global health data interoperability standards

### Phase 4 — Compliance & Scale
- [ ] **Mainnet deployment** with production Hedera credentials
- [ ] **Compliance audit dashboard** — bulk integrity verification for compliance officers and regulators
- [ ] **EHR system integrations** — plug MediLedger Nexus into existing hospital software as a verification middleware

---

## 👤 Author

**Pelumi Idowu** — Frontend Engineer · Web3 Builder

Building at the intersection of healthcare and decentralized infrastructure.

[![GitHub](https://img.shields.io/badge/GitHub-Pearltechie-181717?style=flat-square&logo=github)](https://github.com/Pearltechie)

---

## 🏆 Hackathon Submission

**Event:** Hedera APEX Hackathon  
**Track:** Legacy Track
**Core Hedera Service:** Hedera Consensus Service (HCS)  
**Status:** Working MVP  

| | |
|---|---|
| 🌐 Live Demo | https://medi-ledger-frontend--jehofawapelumi.replit.app |
| 🎥 Demo Video | https://youtu.be/DSXzH3Heiig |
| 💻 Source Code | https://github.com/Pearltechie/MediLedger-Nexus-website |

> *"MediLedger Nexus doesn't change who owns medical records — it makes those records impossible to breach, falsify, or lose."*

---

## 📄 License

This project is licensed under the **MIT License**.
