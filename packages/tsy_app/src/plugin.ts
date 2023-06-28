import { App } from './app'

export abstract class Plugin {
  abstract build(app: App): void
}
