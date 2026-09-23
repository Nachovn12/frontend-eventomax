import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';
import { Location } from '@angular/common';

describe('NotFound Component', () => {
  let component: NotFound;
  let fixture: ComponentFixture<NotFound>;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([{ path: 'dashboard', component: NotFound }])]
    }).compileComponents();

    fixture = TestBed.createComponent(NotFound);
    component = fixture.componentInstance;
    location = TestBed.inject(Location);
    fixture.detectChanges();
  });

  it('renders correctly and shows "Página no encontrada"', () => {
    const heading = fixture.nativeElement.querySelector('.not-found-title');
    expect(heading.textContent).contain('Página no encontrada');

    const actionHome = fixture.nativeElement.querySelector('.not-found-home');
    expect(actionHome.getAttribute('href')).toBe('/dashboard');

    const actionBack = fixture.nativeElement.querySelector('.not-found-back');
    expect(actionBack.textContent).contain('Volver');
  });

  it('calls goBack when back button is clicked', () => {
    const spy = vi.spyOn(component, 'goBack');
    const backBtn = fixture.nativeElement.querySelector('.not-found-back');
    backBtn.click();
    expect(spy).toHaveBeenCalled();
  });
});
