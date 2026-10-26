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

## Authentication — CONFIRMED WORKING END TO END (this session)

**Status: real milestone reached.** Credentials login (internal + client), Google
OAuth, and Microsoft Entra ID OAuth all confirmed working through the real
login page (`src/app/login/page.tsx`, ported from the original app), backed
by Oracle via TypeORM + `@auth/typeorm-adapter`. This section documents
exactly what's required to reproduce this.

### Two separate sets of tables are required

**Set 1 — our own domain tables** (used by the Credentials providers'
`authorize()` functions directly, via `getRepository(User)` /
`getRepository(ClientUser)`):

- `AQUA_USUARIO_INTERNO` — internal staff (maps to `User` entity,
  `src/entities/User.ts`)
- `AQUA_CLIENTE_USUARIO` — portal clients (maps to `ClientUser` entity,
  `src/entities/ClientUser.ts`)

**Set 2 — Auth.js adapter tables** (used by `@auth/typeorm-adapter` for
OAuth account linking — Google, Microsoft — and would handle email
verification tokens if we build that flow later):

- `AQUA_AUTH_USUARIO` — adapter's own user record, created automatically the
  first time someone logs in via OAuth (maps to `UserEntity` in
  `src/lib/auth-adapter-entities.ts`)
- `AQUA_AUTH_CUENTA` — links an OAuth account (Google/Microsoft) to an
  `AQUA_AUTH_USUARIO` row (maps to `AccountEntity`)
- `AQUA_AUTH_SESION` — exists for adapter completeness; NOT actually used
  for session storage since `session: { strategy: "jwt" }` is set in
  `auth.ts` — Auth.js never writes here in practice
- `AQUA_AUTH_TOKEN_VERIF` — email verification tokens (not yet used, no
  flow built for it)

**These two sets are NOT currently reconciled.** A user who logs in via
Google gets a row in `AQUA_AUTH_USUARIO`, completely separate from
`AQUA_USUARIO_INTERNO` — there is no code yet that checks a Google-login
email against the real `User`/`ClientUser` tables, or rejects unknown
emails. This is a real, known gap — the original plan explicitly required
OAuth logins to look up an EXISTING active `User`/`ClientUser` and never
auto-create one; right now the adapter DOES auto-create on every OAuth
login. **Must be fixed before this goes anywhere near production** — see
"Not yet resolved" below.

### Full DDL for every auth table (as tested, working)

```sql
-- As USE_MEDHA:

CREATE TABLE AQUA_USUARIO_INTERNO (
  NCODUSUARIO NUMBER PRIMARY KEY,
  VNOMBRE VARCHAR2(200) NOT NULL,
  VEMAIL VARCHAR2(200) NOT NULL UNIQUE,
  VPASSWORD_HASH VARCHAR2(255),
  VROL VARCHAR2(30) NOT NULL,
  NACTIVO NUMBER(1) DEFAULT 1 NOT NULL,
  DFECCRE DATE DEFAULT SYSDATE NOT NULL,
  DFECACT DATE
);
CREATE SEQUENCE AQUA_USUARIO_INTERNO_SEQ START WITH 1 INCREMENT BY 1;
CREATE OR REPLACE TRIGGER AQUA_USUARIO_INTERNO_BIR
BEFORE INSERT ON AQUA_USUARIO_INTERNO
FOR EACH ROW WHEN (NEW.NCODUSUARIO IS NULL)
BEGIN
  SELECT AQUA_USUARIO_INTERNO_SEQ.NEXTVAL INTO :NEW.NCODUSUARIO FROM dual;
END;

CREATE TABLE AQUA_CLIENTE_USUARIO (
  NCODCLIENTEUSUARIO NUMBER PRIMARY KEY,
  NCODCLIENTE NUMBER NOT NULL,
  VNOMBRE VARCHAR2(200) NOT NULL,
  VEMAIL VARCHAR2(200) NOT NULL UNIQUE,
  VPASSWORD_HASH VARCHAR2(255),
  VROL VARCHAR2(30) NOT NULL,
  NACTIVO NUMBER(1) DEFAULT 1 NOT NULL,
  DFEC_VERIF_EMAIL DATE,
  NCAMBIO_PASS_OBLIG NUMBER(1) DEFAULT 0 NOT NULL,
  DFECCRE DATE DEFAULT SYSDATE NOT NULL
);
CREATE SEQUENCE AQUA_CLIENTE_USUARIO_SEQ START WITH 1 INCREMENT BY 1;
CREATE OR REPLACE TRIGGER AQUA_CLIENTE_USUARIO_BIR
BEFORE INSERT ON AQUA_CLIENTE_USUARIO
FOR EACH ROW WHEN (NEW.NCODCLIENTEUSUARIO IS NULL)
BEGIN
  SELECT AQUA_CLIENTE_USUARIO_SEQ.NEXTVAL INTO :NEW.NCODCLIENTEUSUARIO FROM dual;
END;

CREATE TABLE AQUA_AUTH_USUARIO (
  VCOD VARCHAR2(36) PRIMARY KEY,
  VNOMBRE VARCHAR2(200),
  VEMAIL VARCHAR2(200) UNIQUE,
  VEMAIL_VERIF VARCHAR2(50),
  VIMAGEN VARCHAR2(500)
);

CREATE TABLE AQUA_AUTH_CUENTA (
  VCOD VARCHAR2(36) PRIMARY KEY,
  "userId" VARCHAR2(36) NOT NULL,  -- MUST be named exactly this, see gotcha below
  VTIPO VARCHAR2(50) NOT NULL,
  VPROVEEDOR VARCHAR2(50) NOT NULL,
  VPROVEEDOR_ID VARCHAR2(255) NOT NULL,
  VREFRESH_TOKEN VARCHAR2(4000),   -- widened from 1000, see gotcha below
  VACCESS_TOKEN VARCHAR2(4000),    -- widened from 1000, see gotcha below
  NEXPIRA NUMBER,
  VTOKEN_TIPO VARCHAR2(50),
  VSCOPE VARCHAR2(255),
  VID_TOKEN VARCHAR2(4000),        -- widened from 2000, see gotcha below
  VSESSION_STATE VARCHAR2(255),
  VOAUTH_TOKEN_SECRET VARCHAR2(255),
  VOAUTH_TOKEN VARCHAR2(255)
);

CREATE TABLE AQUA_AUTH_SESION (
  VCOD VARCHAR2(36) PRIMARY KEY,
  VSESSION_TOKEN VARCHAR2(255) UNIQUE NOT NULL,
  "userId" VARCHAR2(36) NOT NULL,  -- MUST be named exactly this, see gotcha below
  VEXPIRA VARCHAR2(50) NOT NULL
);

CREATE TABLE AQUA_AUTH_TOKEN_VERIF (
  VCOD VARCHAR2(36) PRIMARY KEY,
  VTOKEN VARCHAR2(255) NOT NULL,
  VIDENTIFICADOR VARCHAR2(255) NOT NULL,
  VEXPIRA VARCHAR2(50) NOT NULL
);

-- Grants, as USE_MEDHA, for every table above:
GRANT SELECT, INSERT, UPDATE, DELETE ON AQUA_USUARIO_INTERNO TO USE_MEDHA_CONEX;
GRANT SELECT, INSERT, UPDATE, DELETE ON AQUA_CLIENTE_USUARIO TO USE_MEDHA_CONEX;
GRANT SELECT, INSERT, UPDATE, DELETE ON AQUA_AUTH_USUARIO TO USE_MEDHA_CONEX;
GRANT SELECT, INSERT, UPDATE, DELETE ON AQUA_AUTH_CUENTA TO USE_MEDHA_CONEX;
GRANT SELECT, INSERT, UPDATE, DELETE ON AQUA_AUTH_SESION TO USE_MEDHA_CONEX;
GRANT SELECT, INSERT, UPDATE, DELETE ON AQUA_AUTH_TOKEN_VERIF TO USE_MEDHA_CONEX;

-- As USE_MEDHA_CONEX, for every table above:
CREATE SYNONYM AQUA_USUARIO_INTERNO FOR USE_MEDHA.AQUA_USUARIO_INTERNO;
CREATE SYNONYM AQUA_CLIENTE_USUARIO FOR USE_MEDHA.AQUA_CLIENTE_USUARIO;
CREATE SYNONYM AQUA_AUTH_USUARIO FOR USE_MEDHA.AQUA_AUTH_USUARIO;
CREATE SYNONYM AQUA_AUTH_CUENTA FOR USE_MEDHA.AQUA_AUTH_CUENTA;
CREATE SYNONYM AQUA_AUTH_SESION FOR USE_MEDHA.AQUA_AUTH_SESION;
CREATE SYNONYM AQUA_AUTH_TOKEN_VERIF FOR USE_MEDHA.AQUA_AUTH_TOKEN_VERIF;
```

### Auth-specific gotcha #1: `@auth/typeorm-adapter`'s relation columns can't be renamed

The adapter's default entities define `userId` as a plain property that
backs a `@ManyToOne` relation (`AccountEntity.user` → `UserEntity`,
`SessionEntity.user` → `UserEntity`). TypeORM has a known, longstanding bug
(see typeorm/typeorm#2994) where **renaming a relation-backing column via
`@Column({ name: "..." })` breaks internal JOIN query generation** — it
falls back to using the raw property name (`userId`) instead of the mapped
column name, causing `ORA-00904: invalid identifier` at runtime on any
query that touches the relation (e.g. `getUserByAccount`, called on every
OAuth login).

**Confirmed fix**: leave `userId` on `AccountEntity` and `SessionEntity`
using the literal property name as the column name — do NOT apply a custom
`name:` override on these two specific columns, even though every other
column follows the `AQUA_`/`V`/`N`/`D`/`C` convention. This means these two
columns are named `"userId"` (quoted, mixed-case) in Oracle, not
`VCODUSUARIO` — a deliberate, documented exception to the naming
convention, not an oversight.

**Every other column** on the adapter entities (in
`src/lib/auth-adapter-entities.ts`) DOES follow the normal `AQUA_`/prefix
convention via explicit `name:` mapping, since only relation-backing
columns hit this bug.

### Auth-specific gotcha #2: Microsoft's OAuth tokens are much longer than Google's

The adapter's default `AccountEntity.access_token` (and `refresh_token`,
`id_token`) are just `varchar`, no explicit length — when we set explicit
Oracle lengths, `VARCHAR2(1000)` was enough for Google's tokens but failed
with `ORA-12899: value too large` on Microsoft Entra ID's access token
(2559 characters in testing). **Fixed by widening to `VARCHAR2(4000)`**
(Oracle's standard max without enabling extended data types) for
`VACCESS_TOKEN`, `VREFRESH_TOKEN`, and `VID_TOKEN`. Size every OAuth token
column generously from the start for any future provider — don't assume
Google's token lengths are representative.

### Auth-specific gotcha #3: `tsx`/esbuild can't emit decorator metadata

`@auth/typeorm-adapter`'s custom-entities mechanism requires TypeORM's
class-decorator syntax (`@Entity`, `@Column`, `@PrimaryGeneratedColumn`),
NOT the `EntitySchema` style used for our own `User`/`ClientUser`/etc.
entities. `tsx` runs on `esbuild`, which does NOT implement TypeScript's
`emitDecoratorMetadata` compiler option — meaning any `@Column()` that
relies on infering its type from the TS property annotation (e.g.
`type!: string` with no explicit `type:` in the decorator) throws
`ColumnTypeUndefinedError` at runtime, even with
`emitDecoratorMetadata: true` correctly set in `tsconfig.json`.

**Fix**: every single `@Column()` in `src/lib/auth-adapter-entities.ts` has
an explicit `type:` (e.g. `{ type: "varchar", name: "VNOMBRE" }`), never
relying on inference. This works correctly both standalone (`tsx`) and
inside Next.js.

### Auth-specific gotcha #4: `@auth/typeorm-adapter` needs the raw connection
### object, not a `DataSource` instance

`TypeORMAdapter(options, { entities })` expects `options` to be a plain
connection-options object (`{ type: "oracle", host: ..., ... }`) — passing
an already-constructed `DataSource` instance throws
`MissingDriverError: Wrong driver: "undefined" given`, since the adapter
tries to read connection fields directly off whatever you pass and
constructs its own internal `DataSource`.

### Auth-specific gotcha #5: `@auth/typeorm-adapter` is ESM-only, breaks
### standalone `tsx` scripts on static import

`@auth/typeorm-adapter`'s `package.json` only declares an `"import"`
export condition (no `"require"`), which crashes with
`ERR_PACKAGE_PATH_NOT_EXPORTED` when statically imported at the top of a
`tsx`-run script (tsx's path-alias resolver hits it via a CJS-style
lookup). **Fix**: use a dynamic `await import("@auth/typeorm-adapter")`
inside an async function instead of a static top-level import, for any
standalone test script. Not needed inside real Next.js code — Next.js's own
bundler resolves this package fine with a normal static import (confirmed
working in `src/auth.ts`).

### Provider IDs — must match exactly between `auth.ts` and the login page

The real login page (`src/app/login/page.tsx`) calls `signIn()` with these
specific string IDs; `auth.ts`'s providers must use the identical `id:`
values or login silently fails at the `signIn()` call:

| Provider | ID used |
|---|---|
| Internal credentials | `credentials` |
| Client credentials | `client-credentials` |
| Internal Google | `google-internal` |
| Client Google | `google-client` |
| Internal Microsoft | `microsoft-entra-id` |

Both Google providers currently use the SAME `AUTH_GOOGLE_ID`/
`AUTH_GOOGLE_SECRET` — two `Google({...})` provider entries with different
`id:`s, same underlying OAuth app. This means Google's redirect URI
allowlist needs BOTH:
```
http://localhost:4003/api/auth/callback/google-internal
http://localhost:4003/api/auth/callback/google-client
```

### `.env` values needed for auth (this session, dev/test only)

```
AUTH_SECRET=<generate via: openssl rand -base64 32>
AUTH_GOOGLE_ID=<from Google Cloud Console, OAuth client>
AUTH_GOOGLE_SECRET=<same>
AUTH_MICROSOFT_ENTRA_ID_ID=<reused from the original aquasave app's .env>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=<reused from the original aquasave app's .env>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<reused from the original aquasave app's .env — ROTATE this in Azure once real testing is done, since it's now been typed into more than one place>
```

Reused the original app's Microsoft Entra ID app registration rather than
creating a new one — just added this repo's callback URL
(`http://localhost:4003/api/auth/callback/microsoft-entra-id`) to its
existing Authorized redirect URIs list in Azure Portal. Confirmed both
apps' logins work independently, no conflict from sharing one Azure app
registration.

### NOT yet resolved — real gaps before this is production-ready

1. **No access-control check on OAuth login.** Any Google or Microsoft
   account can currently log in and gets auto-created in
   `AQUA_AUTH_USUARIO` — this directly contradicts the original plan's
   requirement ("looks up an EXISTING active User by email... never
   auto-creates one"). Needs a `signIn` callback in `auth.ts` that checks
   the OAuth email against `AQUA_USUARIO_INTERNO`/`AQUA_CLIENTE_USUARIO`
   and rejects unknown/inactive emails BEFORE the adapter auto-creates a
   row.
2. **The two identity systems are unreconciled.** A user's `userType`/
   `role`/`clientId` session claims (set correctly for Credentials logins
   via the `authorize()` return value) are NOT set for OAuth logins at
   all right now — the `jwt`/`session` callbacks in `auth.config.ts` only
   read `user.userType` etc. off whatever the provider returned, and the
   OAuth providers don't return those fields. Needs a `signIn` or `jwt`
   callback that, on OAuth login, looks up the matching
   `User`/`ClientUser` row (by email) and attaches the real
   `userType`/`role`/`clientId` — same lookup as gap #1, could be solved
   together.
3. Everything under "Open questions" (catalog table pattern, PK strategy)
   still applies to `AQUA_USUARIO_INTERNO`/`AQUA_CLIENTE_USUARIO` once the
   real schema is finalized — these auth tables are proven-working
   placeholders, same caveat as the rest of the schema.

## Current status (this session)

- Raw `oracledb` connection: proven working (thick mode).
- TypeORM connection via `EntitySchema`: proven working, both read and write,
  against a throwaway `TEST_ITEMS` table AND against a real trigger-backed
  table (`AQUA_USUARIO_INTERNO`), including the full
  CREATE TABLE → GRANT → CREATE SYNONYM pattern documented above.
- **Authentication: fully working end to end.** Real login page (ported from
  the original app) with Credentials (internal + client), Google OAuth
  (internal + client), and Microsoft Entra ID OAuth (internal) all confirmed
  working against Oracle. See "Authentication" section above for full
  details, required tables, and gotchas. Two real gaps remain before
  production (access control on OAuth, reconciling the two identity
  systems) — documented above, not yet fixed.
- Auth-related entities: `User` (→ `AQUA_USUARIO_INTERNO`), `ClientUser`
  (→ `AQUA_CLIENTE_USUARIO`) — our own domain entities, used directly by
  Credentials providers. Separately, `@auth/typeorm-adapter`'s custom
  entities (→ `AQUA_AUTH_USUARIO`, `AQUA_AUTH_CUENTA`, `AQUA_AUTH_SESION`,
  `AQUA_AUTH_TOKEN_VERIF`) — used for OAuth account linking. All six tables
  exist in Oracle, owned by `USE_MEDHA`, granted + synonym'd for
  `USE_MEDHA_CONEX`. Table names, column choices, and PK strategy on the
  first two are NOT final — see open questions above. The adapter's four
  tables' SHAPE is fixed by the adapter's own requirements (see
  Authentication section), but naming within that shape follows our
  convention except where noted.
- Real domain entities (`ClientSubmission`, etc.): NOT yet started — blocked
  on the two open naming/modeling questions above. This is the next planned
  step now that auth is proven.
- Folder structure mirrored from the original app's `CLAUDE.md` conventions,
  now correctly under `src/` (moved from an initial mistaken root-level
  scaffold — `tsconfig.json`'s `paths` updated to `"@/*": ["./src/*"]`
  accordingly, `baseUrl` NOT needed/added — `moduleResolution: "bundler"`
  resolves `paths` relative to the tsconfig file automatically).
  `next.config.ts` updated with
  `serverExternalPackages: ["oracledb", "typeorm"]`, mirroring the original
  app's same requirement for `pg`. `tsconfig.json` also needed
  `experimentalDecorators: true` and `emitDecoratorMetadata: true` added,
  for the adapter's decorator-based custom entities.
- UI: real `Logo.tsx` and `globals.css` copied over from the original
  Postgres app (pure presentation, zero backend coupling — safe to reuse
  as-is). Real login page (`src/app/login/page.tsx`) also ported from the
  original app.
- Dev server runs on port 4003 (matches the original app's port — decided
  the original app "will never be used again" so no port conflict concern).
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