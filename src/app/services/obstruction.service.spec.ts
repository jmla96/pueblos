import { TestBed } from '@angular/core/testing';

import { ObstructionService } from './obstruction.service';

describe('ObstructionService', () => {
  let service: ObstructionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ObstructionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
