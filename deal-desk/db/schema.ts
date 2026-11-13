// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const trackerSource=sqliteTable('tracker_source',{id:text('id').primaryKey(),payload:text('payload').notNull(),importedAt:text('imported_at').notNull(),revision:integer('revision').notNull().default(1)});
export const handoffs=sqliteTable('handoffs',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const brandProfiles=sqliteTable('brand_profiles',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const deskSettings=sqliteTable('desk_settings',{id:text('id').primaryKey(),payload:text('payload').notNull()});
