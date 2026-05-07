import { sql } from 'drizzle-orm';
import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';
import { eq, or, desc, ilike, isNull } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  last_login_at: text('last_login_at'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').unique().notNull(),
  value: text('value'),
  updated_by: text('updated_by'),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const links = sqliteTable('links', {
  rowid: integer('rowid').primaryKey({ autoIncrement: true }),
  id: text('id').unique(),
  slug: text('slug').notNull().unique(),
  destination_url: text('destination_url').notNull(),
  destination_domain: text('destination_domain'),
  title: text('title'),
  campaign: text('campaign'),
  channel: text('channel'),
  owner: text('owner'),
  sponsor: text('sponsor'),
  opponent: text('opponent'),
  competition: text('competition'),
  match_date: text('match_date'),
  home_away: text('home_away'),
  status: text('status').notNull().default('active'),
  redirect_code: integer('redirect_code').notNull().default(302),
  is_qr: integer('is_qr', { mode: 'boolean' }).notNull().default(false),
  is_offsite_ticket: integer('is_offsite_ticket', { mode: 'boolean' }).notNull().default(false),
  show_offsite_preview: integer('show_offsite_preview', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at'),
  expires_at: text('expires_at'),
  notes: text('notes'),
  created_by: text('created_by'),
  updated_by: text('updated_by'),
  deleted_at: text('deleted_at'),
  variant_of: integer('variant_of').references(() => links.rowid),
  variant_suffix: text('variant_suffix')
});

export const clickEvents = sqliteTable('click_events', {
  rowid: integer('rowid').primaryKey({ autoIncrement: true }),
  id: text('id').unique(),
  slug: text('slug').notNull(),
  clicked_at: text('clicked_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  referrer: text('referrer'),
  country: text('country'),
  city: text('city'),
  utm_source: text('utm_source'),
  utm_medium: text('utm_medium'),
  utm_campaign: text('utm_campaign'),
  utm_term: text('utm_term'),
  utm_content: text('utm_content')
});

export const rateLimits = sqliteTable('rate_limits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ip_address: text('ip_address').notNull(),
  path: text('path').notNull(),
  count: integer('count').notNull(),
  window_start: text('window_start').notNull(),
  window_end: text('window_end').notNull(),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const variantGenerations = sqliteTable('variant_generations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  base_link_id: integer('base_link_id').notNull().references(() => links.rowid),
  variant_type: text('variant_type').notNull(),
  variant_slugs: text('variant_slugs').notNull(),
  created_by: text('created_by'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});