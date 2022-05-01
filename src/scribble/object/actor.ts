import { validate } from "../util.js";

type JSONValue = string | number | boolean | JSONValue[] | {[key: string]: JSONValue} | null;
export interface ActorDef {
	id: number;
	class: string;
	arguments?: (ActorDefArg | unknown)[]
}
export function isActorDef(data: unknown): data is ActorDef {
	return validate(data, {
		id: "number",
		class: "string",
		"arguments?": Array
	}, console.warn);
}
interface ActorDefArg {
	name: string;
	input: number;
	type?: "number" | "boolean" | "string" | "option";
	options?: {[key: string]: JSONValue};
	remap?: unknown[]
}
export function isActorDefArg(data: unknown): data is ActorDefArg {
	return validate(data, {
		name: "string",
		input: "number",
		"type?": {"@": ["number", "boolean", "string", "option"]},
		"options?": {"*": ""},
		"remap?": Array
	});
}