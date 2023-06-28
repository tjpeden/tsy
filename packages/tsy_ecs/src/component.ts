import { WithType } from "./utilities"

export abstract class Component implements WithType {
  public static get type() {
    return this.name
  }

  public get type() {
    return (this.constructor as typeof Component).type
  }
}
