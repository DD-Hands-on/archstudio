// @ts-check
// Shared type definitions for the engine (JSDoc only; no runtime code).
// Checked by `npm run typecheck` (tsc --noEmit with checkJs).

/**
 * A product option for a building block.
 * @typedef {object} Product
 * @property {string} n name
 * @property {string} k kind, for example 'OSS' or 'Commercial'
 * @property {string} w why it fits
 * @property {string} u official link
 * @property {number[]} s five scores from 1 to 5
 * @property {string[]} t tags
 */

/**
 * A building block in the catalogue.
 * @typedef {object} Block
 * @property {string} l label
 * @property {string} layer exp, edge, app, data or x
 * @property {Product[]} o product options
 */

/** @typedef {Record<string, Block>} Catalogue building blocks by id */

/** @typedef {Record<string, number>} Picks product position chosen per block id */

/**
 * The design being evaluated: its blocks and the product chosen for each.
 * @typedef {object} Design
 * @property {string[]} comps block ids
 * @property {Picks} picks
 */

/**
 * One block's enterprise standard. i is the product position, -1 for none. n, the product
 * name, is present only in stored team standards.
 * @typedef {object} Standard
 * @property {number} i
 * @property {'approved' | 'review' | 'none' | string} status
 * @property {string} [n]
 */

/** @typedef {Record<string, Standard>} StandardsMap */

/**
 * @typedef {object} BlockCheck
 * @property {string} c block label
 * @property {'open' | 'free' | 'review' | 'ok' | 'dev'} st
 * @property {string} t explanation
 */

/**
 * @typedef {object} DesignCheck
 * @property {BlockCheck[]} checks
 * @property {number | null} conf percent of measured blocks on standard
 * @property {number} devN blocks off standard or under review
 * @property {number} chosen blocks with a product chosen
 */

export {};
