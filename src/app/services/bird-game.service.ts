import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class birdGameService {
  public startBirdMiniGame(sceneInstance: any) {
    sceneInstance.startBirdMiniGame();
  }
}
