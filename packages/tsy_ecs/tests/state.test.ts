import { State } from '../src/state'

const enum AppState {
  Menu,
  Game,
}

describe('State', () => {
  test('constructor', () => {
    const state = new State(AppState.Menu)

    expect(state.current).toBe(AppState.Menu)
  })
})
