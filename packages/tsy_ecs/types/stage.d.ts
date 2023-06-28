import { World } from './world';
export interface Stage {
    run(world: World): void;
}
