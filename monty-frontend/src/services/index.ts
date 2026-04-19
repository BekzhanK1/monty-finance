/**
 * HTTP client and API modules by vertical (finance vs food).
 * Pages may import from `../api` (barrel) or from here directly.
 */
export { default as api } from './http';
export * from './finance';
export * from './food';
