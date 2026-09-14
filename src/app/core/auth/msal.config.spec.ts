import { InteractionType } from '@azure/msal-browser';
import { msalInterceptorConfigFactory } from './msal.config';
import { environment } from '../../../environments/environment';

describe('MSAL Configuration', () => {
  describe('msalInterceptorConfigFactory', () => {
    it('should create a valid interceptor config mapped exclusively to the API Gateway', () => {
      const config = msalInterceptorConfigFactory();

      expect(config.interactionType).toBe(InteractionType.Redirect);

      const map = config.protectedResourceMap as Map<string, Array<string>>;
      expect(map).toBeDefined();

      const keys = Array.from(map.keys());
      expect(keys.length).toBe(1);

      const expectedKey = `${environment.apiGatewayUrl}/*`;
      expect(keys).toContain(expectedKey);

      const scopes = map.get(expectedKey);
      expect(scopes).toEqual([environment.apiScope]);

      expect(keys).not.toContain('*');
      expect(keys).not.toContain('/*');
    });
  });
});
