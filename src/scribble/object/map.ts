import { Engine } from "../engine.js";
import { never } from "../util.js";

import GameObject from "./instance.js";
import Entity from "./entity.js";
import * as ShapeObjects from "./shapes.js";
import { ActorDef, isActorDef } from "./actor.js";

export type ObjectClass = {
	new (...args: any[]): GameObject;
};
type GameObjectTriggers = {
	[Property in keyof GameObject as 
		GameObject[Property] extends (e: Engine) => void ?
		Property :
		never
	]: GameObject[Property];
}

export default class ObjectMap {
	map = {} as {[id: number]: GameObject};
	nextID = 0;
	actorData = {} as ActorDef[];
	registeredClasses = {} as {[className: string]: ObjectClass};
	minLayer = 0;
	maxLayer = 0;
	constructor(public engine: Engine) {
		this.registerClasses(ShapeObjects);
		this.registerClass("Entity", Entity);
	}
	async loadActorData(url: string) {
		let data: unknown = await (await fetch(url)).json();
		if (data instanceof Array) {
			for (let entry of data as unknown[]) {
				if (isActorDef(entry)) {
					let id = entry.id;
					this.actorData[id] = entry;
				}
				else console.warn("An Actor data entry was not loaded.");
			}
		}
		else throw new Error("Actor data was not an array.");
	}
	add(object: GameObject) {
		object.id = this.nextID++;
		object.objectManager = this;
		this.map[object.id] = object;
		this.minLayer = Math.min(this.minLayer, object.drawLayer);
		this.maxLayer = Math.max(this.maxLayer, object.drawLayer);
	}
	remove(target: number | GameObject) {
		if (typeof target == "number") {
			delete this.map[target];
		}
		else if (target instanceof GameObject) {
			if (target.id !== null)
				delete this.map[target.id];
		}
		else never(target);
	}
	triggerAll(method: keyof GameObjectTriggers) {
		for (let id in this.map) {
			let obj = this.map[id];
			if (obj instanceof GameObject) {
				obj[method](this.engine);
			}
		}
	}
	removeAll() {
		this.triggerAll("remove");
		this.minLayer = this.maxLayer = 0;
	}
	start() {
		this.triggerAll("start");
	}
	update() {
		this.triggerAll("update");
	}
	attackUpdate() {
		this.triggerAll("updateHitboxes");
		this.triggerAll("updateHitDetection");
	}
	finish() {
		this.triggerAll("finish");
	}
	renderLayer(layer: number) {
		this.forAll(object => {
			if (object.drawLayer === layer) object.draw(this.engine.ctx, this.engine.images, this.engine.animations);
		});
	}
	renderDebug() {
		this.forAll(object => {
			object.drawDebug(this.engine.ctx, this.engine.images, this.engine.animations);
		});
	}
	forAll(func: (object: GameObject, id: number) => boolean | void) {
		for (let id in this.map) {
			if (this.map[id]) {
				let response = func(this.map[id], parseInt(id));
				if (response === false) break;
			}
		}
	}
	forAllOfClass<Class extends ObjectClass>(classRef: Class, func: (object: InstanceType<Class>, id: number) => boolean | void) {
		this.forAll((obj, id) => {
			if (obj instanceof classRef) {
				return func(obj as InstanceType<Class>, id);
			}
		});
	}
	registerClasses(classGroup: {[className: string]: ObjectClass}) {
		for (let name in classGroup) {
			this.registeredClasses[name] = classGroup[name];
		}
	}
	registerClass(className: string, classDecl: ObjectClass) {
		this.registeredClasses[className] = classDecl;
	}
}