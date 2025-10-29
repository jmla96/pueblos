import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoriaPage } from './historia.page';

describe('HistoriaPage', () => {
  let component: HistoriaPage;
  let fixture: ComponentFixture<HistoriaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoriaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
