import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MSAL_INSTANCE, MsalService, MsalBroadcastService } from '@azure/msal-angular';
import {
  IPublicClientApplication,
  PublicClientApplication,
  BrowserCacheLocation,
} from '@azure/msal-browser';
import { App } from './app';

function createMockMsalInstance(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: '00000000-0000-0000-0000-000000000000',
      authority: 'https://login.microsoftonline.com/common',
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
  });
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: MSAL_INSTANCE,
          useFactory: createMockMsalInstance,
        },
        MsalService,
        MsalBroadcastService,
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
