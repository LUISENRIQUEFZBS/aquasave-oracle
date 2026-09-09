# AquaSave Oracle — Migration Project Context

A parallel repo used to prove out and build a **PostgreSQL/Prisma → Oracle/TypeORM**
migration for the real AquaSave app (see the original `aquasave` repo's own
`CLAUDE.md` for the full, unmodified application this is meant to eventually
replace or feed into). Nothing here is wired into the real app yet — this repo
exists to validate the new database stack in isolation before any real
migration/cutover happens.

## Why this repo exists (not just modifying the original)

The original `aquasave` app uses Prisma + PostgreSQL. The company (SEDAPAL)
requires Oracle instead, with its own table-naming standard. Rather than
experiment inside the live, working app, this is a from-scratch repo mirroring
the original's folder structure, so that proven pieces can eventually be
ported back — not because Postgres/Prisma code needs to be deleted, but so
mistakes made while learning Oracle/TypeORM never touch the working app.

## Stack differences from the original `aquasave` repo

- **TypeORM** (`^0.3.31`, NOT the newer 1.x line — see gotcha below) instead of
  Prisma. No `schema.prisma`; entities live as individual files under
  `src/entities/`.
- **`oracledb`** (Oracle's official Node driver, `^7.0.1`) instead of `pg`.
  TypeORM's Oracle connector wraps this driver directly.
- **`@auth/typeorm-adapter`** instead of `@auth/prisma-adapter`, for Auth.js
  session/account persistence.
- **`src/lib/db.ts`** replaces `src/lib/prisma.ts` — exports a shared TypeORM
  `DataSource`, with the same "one shared instance, guarded against Next.js
  dev hot-reload duplication" pattern the original's Prisma client used.

## Critical environment gotcha: Oracle Instant Client (thick mode) is required

**This is the single most important thing to know before deploying this app
anywhere, including production.**

The Oracle account this app connects with (`USE_MEDHA_CONEX`, and possibly
others provisioned the same way) has a password stored using an **old-style
password verifier** (Oracle's legacy SHA-1-based hash, type `0x939` — visible
in the `NJS-116` error if you ever see it again). `oracledb`'s default **"thin
mode"** (pure JavaScript, zero native dependencies) explicitly refuses to
authenticate against this verifier type — this is a deliberate security
choice by the driver's authors, not a bug.

**The fix**: use **thick mode**, which delegates to Oracle's own native client
libraries and still supports the old verifier. This requires installing
**Oracle Instant Client** on every machine that runs this app — dev machines,
CI, and the production server alike. `npm install oracledb` alone is NOT
enough; Instant Client is a separate, OS-level, manual install, matched to
each machine's OS/architecture.

### What this means for deployment

- **Every new machine needs Instant Client installed** before this app can
  connect to Oracle. This is a real, recurring setup cost, not a one-time
  fix on one box.
- The install path (e.g. `/opt/oracle/instantclient_23_26` on the current dev
  machine) is **not guaranteed to be the same on other machines** — this is
  why `src/lib/db.ts` reads the path from
  `ORACLE_INSTANT_CLIENT_LIB_DIR` in `.env`, never hardcoded.
- Required system package: `libaio1` or `libaio1t64` (name varies by Ubuntu
  version — Ubuntu 22.04 needed the latter in testing).
- After unzipping Instant Client, register it with `ldconfig`:
  ```bash
  sudo sh -c "echo /opt/oracle/instantclient_23_26 > /etc/ld.so.conf.d/oracle-instantclient.conf"
  sudo ldconfig
  ```

### The real fix — ask the DBA, don't just accept this permanently

**Resetting the account's password on the current Oracle version will likely
regenerate the hash using a modern verifier type**, which `oracledb`'s thin
mode DOES support — removing the Instant Client requirement forever, on every
machine, with zero code changes (just delete the `initOracleClient()` call).
This is worth pursuing as a real, low-effort DBA request before treating thick
mode as a permanent architectural fact. **Status as of this session: not yet
asked / not yet resolved — revisit this.**

## Critical environment gotcha: DNS resolution for Oracle RAC nodes

The connection hostname (`scandesa.sedapal.com.pe`) is an **Oracle RAC SCAN
listener** — it doesn't serve connections directly, it redirects clients to
one of the underlying RAC nodes by *internal* hostname (seen so far:
`sdp-desa1`, `sdp-desa2`). A machine's DNS resolver needs to be able to
resolve these bare internal hostnames, or every connection attempt fails with
`ORA-17868: Unknown host specified` / `Temporary failure in name resolution`,
even though the SCAN hostname itself resolves and is reachable.

**Root cause on the first dev machine**: `systemd-resolved`'s search domain
was empty (`search .` in `resolv.conf`), so bare hostnames like `sdp-desa1`
never got the `.sedapal.com.pe` suffix appended automatically, even though
the internal DNS server itself (`1.1.6.52` in this case) resolved the FQDN
(`sdp-desa1.sedapal.com.pe`) just fine.

**Fix applied**:
```bash
sudo mkdir -p /etc/systemd/resolved.conf.d
sudo tee /etc/systemd/resolved.conf.d/sedapal-domain.conf << 'EOF'
[Resolve]
Domains=sedapal.com.pe
EOF
sudo systemctl restart systemd-resolved
```

**Any new machine (including production) may hit this same issue** if it's
not already configured to use SEDAPAL's internal DNS with the right search
domain. Check with:
```bash
resolvectl status
getent hosts sdp-desa1
```
before assuming a connection failure is credentials-related — it's very
likely this instead.

## Critical gotcha: every new table needs THREE steps, not just CREATE TABLE

Confirmed through direct testing (`AQUA_USUARIO_INTERNO` and friends). A table
created as `USE_MEDHA` is invisible to the app (`USE_MEDHA_CONEX`) until BOTH
of the following are also done — skipping either produces a real, blocking
error, not a warning:

1. **`CREATE TABLE ...`** — as `USE_MEDHA` (the object owner; `USE_MEDHA_CONEX`
   lacks `CREATE TRIGGER`/`CREATE PROCEDURE`, confirmed via `SESSION_PRIVS`,
   so sequences+triggers for auto-incrementing IDs must be created here too).
2. **`GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO USE_MEDHA_CONEX;`**
   — as `USE_MEDHA`. Without this, `USE_MEDHA_CONEX` gets
   `ORA-00942: table or view does not exist` even though the table is real.
3. **`CREATE SYNONYM <table> FOR USE_MEDHA.<table>;`** — as `USE_MEDHA_CONEX`.
   **The grant alone is NOT enough.** Without the synonym, bare-name queries
   (`SELECT * FROM AQUA_USUARIO_INTERNO`, and critically, every TypeORM query
   TypeORM generates, since entities reference tables by bare name) STILL fail
   with `ORA-00942`, because Oracle looks for the table inside the querying
   user's OWN schema first, and `USE_MEDHA_CONEX` doesn't have one by that
   name — it needs an explicit synonym pointing to `USE_MEDHA`'s copy.

**Reusable template for every new table going forward:**
```sql
-- As USE_MEDHA:
CREATE TABLE <TABLE_NAME> ( ... );
CREATE SEQUENCE <TABLE_NAME>_SEQ START WITH 1 INCREMENT BY 1;
CREATE OR REPLACE TRIGGER <TABLE_NAME>_BIR
BEFORE INSERT ON <TABLE_NAME>
FOR EACH ROW
WHEN (NEW.<PK_COLUMN> IS NULL)
BEGIN
  SELECT <TABLE_NAME>_SEQ.NEXTVAL INTO :NEW.<PK_COLUMN> FROM dual;
END;
GRANT SELECT, INSERT, UPDATE, DELETE ON <TABLE_NAME> TO USE_MEDHA_CONEX;

-- As USE_MEDHA_CONEX:
CREATE SYNONYM <TABLE_NAME> FOR USE_MEDHA.<TABLE_NAME>;
```

**Worth asking the DBA**: whether `USE_MEDHA_CONEX` could instead get a
standing arrangement (e.g. PUBLIC synonyms, created once by `USE_MEDHA` at
table-creation time) so this doesn't need to be repeated by hand for every
single table as the schema grows. Not yet asked — revisit if this becomes
tedious across dozens of tables.

**Debugging tip**: `SELECT USER FROM dual;` before every DDL/grant/synonym
statement, every time, no exceptions. Several real debugging sessions tonight
were caused purely by assuming which DBeaver tab/connection was active and
being wrong — this one-line check would have caught each instance immediately.

## Known TypeORM + Oracle + trigger-generated-ID quirk

When a table's primary key is populated by an Oracle trigger (not TypeORM's
own generation strategy), `repository.save()` inserts the row correctly, but
the returned JS object's ID field comes back as `undefined` — TypeORM has no
built-in way to read back a trigger-populated value the way it does with
`IDENTITY` columns or native `RETURNING` support for its own generators. The
row in the database is correct; only the in-memory return value is missing
the ID. Confirmed via `scripts/test-user-entity.ts`.

**Not yet solved properly.** Workarounds to explore later: a custom raw query
using `RETURNING <PK_COLUMN> INTO :id` after insert, or re-fetching the row
by a unique field (e.g. email) immediately after `save()` when the ID is
needed right away in the same request.

## Database credentials — two accounts, different jobs (confirmed via DBeaver testing)

- **`USE_MEDHA`** — schema/object owner. Has DDL privileges (`CREATE TABLE`,
  `CREATE SEQUENCE`, `CREATE TRIGGER`, etc.). **Use this account for schema
  changes and migrations.**
- **`USE_MEDHA_CONEX`** — application connection user. Deliberately
  restricted to DML only (`SELECT`/`INSERT`/`UPDATE`/`DELETE`), no DDL rights
  — confirmed via `ORA-01031: insufficient privileges` when attempting
  `CREATE SEQUENCE` with this account. **This is the account the running app
  itself should use.**
- A table created as `USE_MEDHA` is not automatically visible/usable by
  `USE_MEDHA_CONEX` — an explicit `GRANT` may be required per table/object.
  Confirm this pattern holds as more objects are created.

Connection details: `scandesa.sedapal.com.pe:1521`, service name `SAPLIDES`
(confirmed as service name via successful `serviceName:` config — not tested
as a SID).

## Database naming convention (from company standard — confirmed + open questions)

Confirmed via a training session and a generic ERwin example
(`AQUA_SOLICITUDES` / `AQUA_PRODUCTOS`, explicitly a generic illustrative
example, NOT the real intended schema for this app's actual tables):

- **App-specific tables** are prefixed `AQUA_...`. **Shared/common tables**
  used across multiple SEDAPAL systems (e.g. `AREA`, `TRABAJADOR`, `USUARIO`)
  have no prefix.
- **Column name prefixes indicate data type**:
  | Prefix | Oracle type |
  |---|---|
  | `N` | `NUMBER` |
  | `V` | `VARCHAR2` |
  | `D` | `DATE` |
  | `C` | `CHAR` |
- **Standard audit columns** appear on every table in the example model:
  `DFECCRE` (created at), `DFECACT` (updated at), `VRESCRE` (created by, as a
  short user/session string, not a FK), `VRESACT` (updated by).
- **Mapping strategy for TypeORM entities**: keep TypeScript class/property
  names in English (matching the original app's "code in English, UI text in
  Spanish" convention), and map to the real Spanish physical column names via
  explicit `name:` options in `@Column`/`EntitySchema` definitions — same
  spirit as the original Prisma schema's `@map(...)` usage for legacy
  columns.

### Open questions — NOT yet confirmed, do not assume before building real entities

1. **Catalog table pattern (`ATD_TIPO`)**: the ERwin diagram shows a generic,
   reusable type/status catalog table. Unclear whether status-like fields
   (e.g. `ClientSubmission.status`) should be modeled as an FK into this
   shared catalog, or as a plain `NUMBER` per table. **Affects every
   enum-like field in the schema — resolve before modeling broadly.**
2. **Primary key strategy**: the `AQUA_PRODUCTOS` example used a composite
   natural key (child table repeats parent's PK column as part of its own
   key), rather than an independent surrogate key + separate FK column.
   Unclear whether this is the mandatory convention for all parent/child
   relationships, or just how that one example happened to be modeled.
   **Affects the design of every one-to-many relationship in the schema.**

Draft entities built so far (see "Current status" below) use a placeholder
assumption (single surrogate `NUMBER` PK per table) pending answers to these
two questions — expect rework on this point.

## TypeORM version — pinned to 0.3.x, not 1.x

`@auth/typeorm-adapter@2.11.3` requires `typeorm@^0.3.7` and is NOT yet
compatible with TypeORM's new 1.x major version (confirmed via `npm list`
showing an `invalid:` peer dependency warning when 1.1.1 was installed).
**Do not upgrade TypeORM past the 0.3.x line** until the Auth.js adapter
ecosystem catches up, or a different adapter/approach is adopted.

## npm install gotcha: `--legacy-peer-deps` required

`@auth/typeorm-adapter` and `typeorm` both list `mssql` (SQL Server driver)
as an *optional* peer dependency, but expect different version ranges of it.
Since this project doesn't use SQL Server at all, this conflict is
irrelevant to us but still trips npm's strict resolver. Install with:
```bash
npm install <packages> --legacy-peer-deps
```

## Current status (this session)

- Raw `oracledb` connection: proven working (thick mode).
- TypeORM connection via `EntitySchema`: proven working, both read and write,
  against a throwaway `TEST_ITEMS` table AND against a real trigger-backed
  table (`AQUA_USUARIO_INTERNO`), including the full
  CREATE TABLE → GRANT → CREATE SYNONYM pattern documented above.
- Auth-related entities created as PLACEHOLDERS, pending the real naming
  convention answers: `User` (→ `AQUA_USUARIO_INTERNO`), `ClientUser`
  (→ `AQUA_CLIENTE_USUARIO`), `AuthAccount` (→ `AQUA_AUTH_ACCOUNT`),
  `AuthVerificationToken` (→ `AQUA_AUTH_VERIF_TOKEN`) — all four tables exist
  in Oracle now, owned by `USE_MEDHA`, granted + synonym'd for
  `USE_MEDHA_CONEX`. Table names, column choices, and PK strategy on these
  are NOT final — see open questions above.
- No `Session` entity — matches the original app's `session: { strategy:
  "jwt" }`, so Auth.js never persists sessions to the DB; only `Account` and
  `VerificationToken` are needed for the adapter.
- Real domain entities (`ClientSubmission`, etc.): NOT yet started — blocked
  on the two open naming/modeling questions above.
- Auth.js + `@auth/typeorm-adapter` wiring in `auth.ts`/`auth.config.ts`:
  NOT yet started — entities are ready, this is the next real step.
- Folder structure mirrored from the original app's `CLAUDE.md` conventions,
  now correctly under `src/` (moved from an initial mistaken root-level
  scaffold — `tsconfig.json`'s `paths` updated to `"@/*": ["./src/*"]`
  accordingly). `next.config.ts` updated with
  `serverExternalPackages: ["oracledb", "typeorm"]`, mirroring the original
  app's same requirement for `pg`.
- A companion file, `CLAUDE-POSTGRES.md`, holds the ORIGINAL Postgres/Prisma
  app's CLAUDE.md verbatim, for reference only — not describing this repo.

## Folder structure (mirrors the original `aquasave` repo's conventions)

```
src/
  app/
    (dashboard)/          - clients, dispatch, instruments, types, catalogs, users, files
    portal/
      (gated)/
      security/
    api/
      certificates/preview/[evaluationId]/route.ts
      portal-pdf/[submissionId]/route.tsx
      client-uploads/[...path]/route.ts
      uploads/[...path]/route.ts
  lib/
    actions/             - one file per domain entity, same as original
    pdf/                 - same components as original
    db.ts                - shared TypeORM DataSource (replaces prisma.ts)
    resolve-upload-url.ts
    evaluation-data.ts, certification-criteria.ts, fixed-reference-criteria.ts, gcfo0182-terms.ts
  entities/              - NEW, does not exist in original (which uses schema.prisma instead)
  components/ui/Drawer.tsx
  auth.ts, auth.config.ts
  proxy.ts
```

## Environment variables (`.env` / `.env.local` — never commit either)

```
ORACLE_HOST=scandesa.sedapal.com.pe
ORACLE_PORT=1521
ORACLE_SERVICE_NAME=SAPLIDES
ORACLE_USER=USE_MEDHA_CONEX
ORACLE_PASSWORD=<see team, do not hardcode>
ORACLE_INSTANT_CLIENT_LIB_DIR=/opt/oracle/instantclient_23_26
```

## Not yet resolved / next steps

- Send naming-convention questions to Eli/Luis (catalog table pattern, PK
  strategy) — answers needed before real entity modeling can proceed
  confidently.
- Ask DBA about resetting `USE_MEDHA_CONEX`'s password to get a modern
  verifier type, removing the Instant Client requirement long-term.
- Confirm grant pattern between `USE_MEDHA` (owner) and `USE_MEDHA_CONEX`
  (app user) for newly created objects.
- Wire up `@auth/typeorm-adapter` in `auth.ts` once entity design is settled.
- Decide the real migration strategy: full cutover vs. dual-write vs.
  gradual per-domain migration — not yet discussed.