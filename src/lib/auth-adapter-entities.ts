import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ValueTransformer,
} from "typeorm";

const dateTransformer: ValueTransformer = {
  from: (date: string | null) => date && new Date(parseInt(date, 10)),
  to: (date?: Date) => date?.valueOf().toString(),
};

@Entity({ name: "AQUA_AUTH_USUARIO" })
export class UserEntity {
  @PrimaryGeneratedColumn("uuid", { name: "VCOD" })
  id!: string;

  @Column({ type: "varchar", length: 200, nullable: true, name: "VNOMBRE" })
  name!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true, unique: true, name: "VEMAIL" })
  email!: string | null;

  @Column({ type: "varchar", nullable: true, transformer: dateTransformer, name: "VEMAIL_VERIF" })
  emailVerified!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "VIMAGEN" })
  image!: string | null;

  @OneToMany(() => SessionEntity, (session) => session.userId)
  sessions!: SessionEntity[];

  @OneToMany(() => AccountEntity, (account) => account.userId)
  accounts!: AccountEntity[];
}

@Entity({ name: "AQUA_AUTH_CUENTA" })
export class AccountEntity {
  @PrimaryGeneratedColumn("uuid", { name: "VCOD" })
  id!: string;

  @Column({ type: "varchar", length: 36})
  userId!: string;

  @Column({ type: "varchar", name: "VTIPO" })
  type!: string;

  @Column({ type: "varchar", name: "VPROVEEDOR" })
  provider!: string;

  @Column({ type: "varchar", name: "VPROVEEDOR_ID" })
  providerAccountId!: string;

  @Column({ type: "varchar", nullable: true, name: "VREFRESH_TOKEN" })
  refresh_token!: string | null;

  @Column({ type: "varchar", nullable: true, name: "VACCESS_TOKEN" })
  access_token!: string | null;

  @Column({ type: "number", nullable: true, name: "NEXPIRA" })
  expires_at!: number | null;

  @Column({ type: "varchar", nullable: true, name: "VTOKEN_TIPO" })
  token_type!: string | null;

  @Column({ type: "varchar", nullable: true, name: "VSCOPE" })
  scope!: string | null;

  @Column({ type: "varchar", nullable: true, name: "VID_TOKEN" })
  id_token!: string | null;

  @Column({ type: "varchar", nullable: true, name: "VSESSION_STATE" })
  session_state!: string | null;

  @Column({ type: "varchar", nullable: true, name: "VOAUTH_TOKEN_SECRET" })
  oauth_token_secret!: string | null;

  @Column({ type: "varchar", nullable: true, name: "VOAUTH_TOKEN" })
  oauth_token!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.accounts, {
    createForeignKeyConstraints: true,
  })
  user!: UserEntity;
}

@Entity({ name: "AQUA_AUTH_SESION" })
export class SessionEntity {
  @PrimaryGeneratedColumn("uuid", { name: "VCOD" })
  id!: string;

  @Column({ type: "varchar", unique: true, name: "VSESSION_TOKEN" })
  sessionToken!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", transformer: dateTransformer, name: "VEXPIRA" })
  expires!: string;

  @ManyToOne(() => UserEntity, (user) => user.sessions)
  user!: UserEntity;
}

@Entity({ name: "AQUA_AUTH_TOKEN_VERIF" })
export class VerificationTokenEntity {
  @PrimaryGeneratedColumn("uuid", { name: "VCOD" })
  id!: string;

  @Column({ type: "varchar", name: "VTOKEN" })
  token!: string;

  @Column({ type: "varchar", name: "VIDENTIFICADOR" })
  identifier!: string;

  @Column({ type: "varchar", transformer: dateTransformer, name: "VEXPIRA" })
  expires!: string;
}