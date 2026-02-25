/**
 * Pushover Skill Tests
 */

const { sendPushoverNotification } = require('./index.js');

// Mock fetch globally for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Pushover Skill', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });
  
  describe('sendPushoverNotification', () => {
    it('should throw error when PUSHOVER_TOKEN is missing', async () => {
      delete process.env.PUSHOVER_TOKEN;
      delete process.env.PUSHOVER_USER_KEY;
      
      await expect(sendPushoverNotification({ message: 'test' }))
        .rejects.toThrow('PUSHOVER_TOKEN and PUSHOVER_USER_KEY must be set');
    });
    
    it('should throw error when PUSHOVER_USER_KEY is missing', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      delete process.env.PUSHOVER_USER_KEY;
      
      await expect(sendPushoverNotification({ message: 'test' }))
        .rejects.toThrow('PUSHOVER_TOKEN and PUSHOVER_USER_KEY must be set');
    });
    
    it('should throw error when message is missing', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      process.env.PUSHOVER_USER_KEY = 'test_user';
      
      await expect(sendPushoverNotification({}))
        .rejects.toThrow('message is required');
    });
    
    it('should send notification with basic parameters', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      process.env.PUSHOVER_USER_KEY = 'test_user';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, request: 'abc123' })
      });
      
      const result = await sendPushoverNotification({ message: 'Hello World' });
      
      expect(result.success).toBe(true);
      expect(result.requestId).toBe('abc123');
      
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.pushover.net/1/messages.json');
      expect(callArgs[1].method).toBe('POST');
    });
    
    it('should include title when provided', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      process.env.PUSHOVER_USER_KEY = 'test_user';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, request: 'abc123' })
      });
      
      await sendPushoverNotification({ 
        message: 'Test', 
        title: 'My Title' 
      });
      
      const formData = mockFetch.mock.calls[0][1].body.toString();
      expect(formData).toContain('title=My+Title');
    });
    
    it('should include priority when provided', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      process.env.PUSHOVER_USER_KEY = 'test_user';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, request: 'abc123' })
      });
      
      await sendPushoverNotification({ 
        message: 'High Priority', 
        priority: 1 
      });
      
      const formData = mockFetch.mock.calls[0][1].body.toString();
      expect(formData).toContain('priority=1');
    });
    
    it('should include sound when provided', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      process.env.PUSHOVER_USER_KEY = 'test_user';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, request: 'abc123' })
      });
      
      await sendPushoverNotification({ 
        message: 'With Sound', 
        sound: 'gamelan' 
      });
      
      const formData = mockFetch.mock.calls[0][1].body.toString();
      expect(formData).toContain('sound=gamelan');
    });
    
    it('should throw error for priority 2 without retry/expire', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      process.env.PUSHOVER_USER_KEY = 'test_user';
      
      await expect(sendPushoverNotification({ 
        message: 'Emergency', 
        priority: 2 
      })).rejects.toThrow('retry and expire are required for priority 2');
    });
    
    it('should include retry/expire for priority 2', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      process.env.PUSHOVER_USER_KEY = 'test_user';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, request: 'abc123' })
      });
      
      await sendPushoverNotification({ 
        message: 'Emergency', 
        priority: 2,
        retry: 30,
        expire: 3600
      });
      
      const formData = mockFetch.mock.calls[0][1].body.toString();
      expect(formData).toContain('priority=2');
      expect(formData).toContain('retry=30');
      expect(formData).toContain('expire=3600');
    });
    
    it('should throw error for invalid sound', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      process.env.PUSHOVER_USER_KEY = 'test_user';
      
      await expect(sendPushoverNotification({ 
        message: 'Test', 
        sound: 'invalid_sound'
      })).rejects.toThrow('Invalid sound');
    });
    
    it('should handle API errors', async () => {
      process.env.PUSHOVER_TOKEN = 'test_token';
      process.env.PUSHOVER_USER_KEY = 'test_user';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          status: 0, 
          errors: ['Invalid token'],
          message: 'error' 
        })
      });
      
      await expect(sendPushoverNotification({ message: 'Test' }))
        .rejects.toThrow('Invalid token');
    });
  });
});
