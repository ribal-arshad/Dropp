import { Args, Command, Flags } from "@oclif/core";
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";

const ORM_OPTIONS = [
  "prisma",
  "typeorm",
  "drizzle",
  "sequelize",
  "mikroorm",
  "mongoose",
  "kysely",
] as const;

type SupportedOrm = (typeof ORM_OPTIONS)[number];

export default class GenerateModel extends Command {
  static override description =
    "Generate media model/schema boilerplate for a target ORM";

  static override args = {
    name: Args.string({
      description: "Model name (example: media)",
      required: true,
    }),
  };

  static override flags = {
    orm: Flags.string({
      description: "Target ORM",
      required: true,
      options: ORM_OPTIONS as unknown as string[],
    }),
    force: Flags.boolean({
      char: "f",
      description: "Overwrite existing generated model file",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenerateModel);
    const orm = flags.orm as SupportedOrm;
    const modelName = args.name.toLowerCase();
    const className = this.toPascalCase(modelName);

    const targetPath = this.resolveOutputPath(orm, modelName, className);
    await this.ensureWritable(targetPath, flags.force);

    const content = this.renderTemplate(orm, modelName, className);

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");

    this.log(`Generated ${orm} model template:`);
    this.log(targetPath);
  }

  private resolveOutputPath(
    orm: SupportedOrm,
    modelName: string,
    className: string,
  ): string {
    if (orm === "prisma")
      return join(process.cwd(), "prisma", `schema.${modelName}.prisma`);
    if (orm === "drizzle")
      return join(process.cwd(), "src", "db", `schema.${modelName}.ts`);
    if (orm === "sequelize")
      return join(process.cwd(), "src", "models", `${className}.model.ts`);
    if (orm === "mongoose")
      return join(process.cwd(), "src", "models", `${className}.model.ts`);
    if (orm === "kysely")
      return join(process.cwd(), "src", "db", `${modelName}.types.ts`);

    return join(process.cwd(), "src", "entities", `${className}.entity.ts`);
  }

  private renderTemplate(
    orm: SupportedOrm,
    modelName: string,
    className: string,
  ): string {
    if (orm === "prisma") {
      return `model ${className} {
  id         String   @id @default(uuid())
  model      String
  modelId    String
  collection String
  fileName   String
  mimeType   String
  size       Int
  disk       String
  path       String
  url        String
  metadata   Json
  createdAt  DateTime @default(now())

  @@map("${modelName}")
}
`;
    }

    if (orm === "typeorm") {
      return `import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("${modelName}")
export class ${className}Entity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  model!: string;

  @Column()
  modelId!: string;

  @Column({ default: "default" })
  collection!: string;

  @Column()
  fileName!: string;

  @Column()
  mimeType!: string;

  @Column({ type: "int", default: 0 })
  size!: number;

  @Column({ default: "default" })
  disk!: string;

  @Column()
  path!: string;

  @Column()
  url!: string;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
`;
    }

    if (orm === "drizzle") {
      return `import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const ${modelName}Table = pgTable("${modelName}", {
  id: uuid("id").defaultRandom().primaryKey(),
  model: text("model").notNull(),
  modelId: text("model_id").notNull(),
  collection: text("collection").notNull().default("default"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull().default(0),
  disk: text("disk").notNull().default("default"),
  path: text("path").notNull(),
  url: text("url").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
`;
    }

    if (orm === "sequelize") {
      return `import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize.js";

export class ${className}Model extends Model {}

${className}Model.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    model: { type: DataTypes.STRING, allowNull: false },
    modelId: { type: DataTypes.STRING, allowNull: false },
    collection: { type: DataTypes.STRING, allowNull: false, defaultValue: "default" },
    fileName: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: false },
    size: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    disk: { type: DataTypes.STRING, allowNull: false, defaultValue: "default" },
    path: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: "${modelName}",
    updatedAt: false,
  },
);
`;
    }

    if (orm === "mikroorm") {
      return `import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity({ tableName: "${modelName}" })
export class ${className}Entity {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Property()
  model!: string;

  @Property()
  modelId!: string;

  @Property({ default: "default" })
  collection: string = "default";

  @Property()
  fileName!: string;

  @Property()
  mimeType!: string;

  @Property({ type: "number", default: 0 })
  size: number = 0;

  @Property({ default: "default" })
  disk: string = "default";

  @Property()
  path!: string;

  @Property()
  url!: string;

  @Property({ type: "json", default: {} })
  metadata: Record<string, unknown> = {};

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
`;
    }

    if (orm === "mongoose") {
      return `import { Schema, model } from "mongoose";

const ${className}Schema = new Schema(
  {
    model: { type: String, required: true },
    modelId: { type: String, required: true },
    collection: { type: String, default: "default" },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, default: 0 },
    disk: { type: String, default: "default" },
    path: { type: String, required: true },
    url: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    collection: "${modelName}",
  },
);

export const ${className}Model = model("${className}", ${className}Schema);
`;
    }

    return `export type ${className}Row = {
  id: string;
  model: string;
  modelId: string;
  collection: string;
  fileName: string;
  mimeType: string;
  size: number;
  disk: string;
  path: string;
  url: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};
`;
  }

  private async ensureWritable(path: string, force: boolean): Promise<void> {
    try {
      await access(path, constants.F_OK);
    } catch {
      return;
    }

    if (!force) {
      throw new Error(`${path} already exists. Use --force to overwrite.`);
    }
  }

  private toPascalCase(value: string): string {
    return value
      .split(/[^a-zA-Z0-9]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }
}
