#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/cbbc46abb9e405e77f51013996747bdd3ae5b9defd738263f6b028c087c99b39/contract'
import endContract from '../../snapshots/cbbc46abb9e405e77f51013996747bdd3ae5b9defd738263f6b028c087c99b39/contract.json' with { type: 'json' }
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration'

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'bookmarks',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn(sql`gen_random_uuid()`),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('recipe_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('user_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'recipes',
        columns: [
          col('cook_time', 'int4', {
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('directions', 'json', {
            notNull: true,
            default: fn(sql`'[]'::jsonb`),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn(sql`gen_random_uuid()`),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('image_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ingredients', 'json', {
            notNull: true,
            default: fn(sql`'[]'::jsonb`),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('is_public', 'bool', {
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('servings', 'int4', {
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('source', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('summary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tags', 'text[]', {
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('tips', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('user_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'recipes_tags_elem_not_null_aecbe9e2',
            sql`array_position("tags", NULL) IS NULL`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn(sql`gen_random_uuid()`),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('password_hash', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'bookmarks',
        constraint: 'bookmarks_user_id_recipe_id_key',
        columns: ['user_id', 'recipe_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'bookmarks',
        index: 'bookmarks_recipe_id_idx_bc78e692',
        columns: ['recipe_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'bookmarks',
        index: 'bookmarks_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recipes',
        index: 'recipes_created_at_225d8c0f',
        columns: ['created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recipes',
        index: 'recipes_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'bookmarks',
        foreignKey: {
          name: 'bookmarks_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'bookmarks',
        foreignKey: {
          name: 'bookmarks_recipe_id_fkey',
          columns: ['recipe_id'],
          references: { schema: 'public', table: 'recipes', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'recipes',
        foreignKey: {
          name: 'recipes_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ]
  }
}

MigrationCLI.run(import.meta.url, M)
