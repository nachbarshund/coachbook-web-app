// Minimal React-element-to-SVG-string serializer for the server-side GIF render.
// `react-dom/server` cannot be imported from App Router code (Next.js rejects it at build time),
// and `SceneSvg` only uses function components and plain SVG elements, so walking the
// element tree is enough. No hooks, no context, no async components.
import { Fragment, type ReactNode } from "react";

// SVG attributes that are camelCase in the SVG spec itself; everything else is kebab-cased.
const CAMEL_SVG_ATTRIBUTES = new Set([
  "viewBox",
  "preserveAspectRatio",
  "patternUnits",
  "patternContentUnits",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "refX",
  "refY",
  "clipPathUnits",
  "gradientUnits",
  "gradientTransform",
]);

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

function attributeName(prop: string): string {
  if (CAMEL_SVG_ATTRIBUTES.has(prop)) return prop;
  return prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

type ElementLike = { type: unknown; props: Record<string, unknown> };

function isElement(node: unknown): node is ElementLike {
  return typeof node === "object" && node !== null && "type" in node && "props" in node;
}

function serialize(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return escapeText(node);
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(serialize).join("");
  if (!isElement(node)) throw new Error("Unsupported node in SVG scene.");

  const { type, props } = node;
  const children = props.children as ReactNode;

  if (type === Fragment) return serialize(children);
  if (typeof type === "function") return serialize((type as (p: unknown) => ReactNode)(props));
  if (typeof type !== "string") throw new Error("Unsupported element type in SVG scene.");

  let attributes = "";
  for (const [key, value] of Object.entries(props)) {
    if (key === "children" || value === undefined || value === null || value === false) continue;
    attributes += ` ${attributeName(key)}="${escapeAttribute(String(value))}"`;
  }
  return `<${type}${attributes}>${serialize(children)}</${type}>`;
}

/** Serializes a tree of function components and plain elements to a markup string. */
export function renderToSvgString(node: ReactNode): string {
  return serialize(node);
}
