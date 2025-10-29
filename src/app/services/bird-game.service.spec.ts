import { TestBed } from '@angular/core/testing';

import { BirdGameService } from './bird-game.service';

describe('BirdGameService', () => {
  let service: BirdGameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BirdGameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
