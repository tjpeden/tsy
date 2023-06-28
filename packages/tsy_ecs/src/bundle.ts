import { Component } from "./component"

export abstract class Bundle {
  public get components(): Component[] {
    const self: Record<string, Component | Bundle> = this as any

    return Object
    .getOwnPropertyNames(self)
    .reduce(
      (components: Component[], key) => {
        const component = self[key]

        if (component instanceof Component) {
          components.push(component)
        } else if (component instanceof Bundle) {
          components.push(...component.components)
        }

        return components
      },
      [],
    )
  }
}
