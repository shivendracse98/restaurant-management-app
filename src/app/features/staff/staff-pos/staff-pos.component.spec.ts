import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffPosComponent } from './staff-pos.component';

describe('StaffPosComponent', () => {
  let component: StaffPosComponent;
  let fixture: ComponentFixture<StaffPosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffPosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StaffPosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
