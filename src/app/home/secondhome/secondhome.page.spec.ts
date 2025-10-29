import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecondhomePage } from './secondhome.page';

describe('SecondhomePage', () => {
  let component: SecondhomePage;
  let fixture: ComponentFixture<SecondhomePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SecondhomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
