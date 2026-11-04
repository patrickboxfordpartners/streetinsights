import type { OrPart, SelectField } from "./types.js";

const NAME = /^[A-Za-z_*][A-Za-z0-9_]*$/;

export function parseSelect(input: string | undefined): SelectField[] {
  if (!input || !input.trim() || input.trim() === "*") return [{ column: "*" }];
  const { nodes, index } = parseList(input, 0);
  if (index < input.length && input[index] !== undefined && input.slice(index).trim()) {
    const rest = input.slice(index).trim();
    if (rest) throw new Error(`Could not parse select list near "${rest.slice(0, 40)}"`);
  }
  return nodes.length > 0 ? nodes : [{ column: "*" }];
}

function parseList(input: string, index: number): { nodes: SelectField[]; index: number } {
  const nodes: SelectField[] = [];
  while (index < input.length) {
    index = skip(input, index);
    if (index >= input.length || input[index] === ")") break;
    if (input[index] === ",") {
      index += 1;
      continue;
    }
    const nameStart = index;
    if (input[index] === "*") {
      index += 1;
    } else {
      while (index < input.length && /[A-Za-z0-9_]/.test(input[index])) index += 1;
    }
    let name = input.slice(nameStart, index);
    let inner = false;
    if (name.endsWith("!inner") || input.slice(index, index + 6) === "!inner") {
      if (input.slice(index, index + 6) === "!inner") {
        index += 6;
      } else {
        name = name.slice(0, -"!inner".length);
      }
      inner = true;
    }
    if (!NAME.test(name) && name !== "*") {
      throw new Error(`Invalid select name "${name}"`);
    }
    index = skip(input, index);
    if (input[index] === "(") {
      const nested = parseList(input, index + 1);
      index = skip(input, nested.index);
      if (input[index] !== ")") throw new Error(`Unclosed select for ${name}`);
      index += 1;
      nodes.push({
        relation: name,
        inner,
        children: nested.nodes,
      });
      continue;
    }
    nodes.push({ column: name });
  }
  return { nodes, index };
}

function skip(input: string, index: number): number {
  while (index < input.length && /\s/.test(input[index])) index += 1;
  return index;
}

export function parseOr(raw: string): OrPart[] {
  return raw.split(",").map((piece) => {
    const match = piece.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\.(eq|neq|gt|gte|lt|lte|ilike|is)\.(.*)$/);
    if (!match) throw new Error(`Invalid or() filter "${piece.trim()}"`);
    const [, column, op, rawValue] = match;
    return { column, op: op as OrPart["op"], value: coerceLiteral(rawValue) };
  });
}

export function coerceLiteral(raw: string): unknown {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

export function parseInList(raw: string): string[] {
  const trimmed = raw.trim().replace(/^\(/, "").replace(/\)$/, "");
  if (!trimmed) return [];
  return trimmed.split(",").map((part) => part.trim()).filter(Boolean);
}
