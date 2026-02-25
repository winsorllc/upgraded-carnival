/**
 * Image Generation Skill Tests
 */

const { generateImage } = require('./index.js');

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Image Generation Skill', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });
  
  describe('generateImage', () => {
    it('should throw error when OPENAI_API_KEY is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      
      await expect(generateImage({ prompt: 'test' }))
        .rejects.toThrow('OPENAI_API_KEY must be set');
    });
    
    it('should throw error when prompt is missing', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      await expect(generateImage({}))
        .rejects.toThrow('prompt is required');
    });
    
    it('should throw error for invalid model', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      await expect(generateImage({ prompt: 'test', model: 'invalid' }))
        .rejects.toThrow('Invalid model');
    });
    
    it('should throw error for invalid size for model', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      await expect(generateImage({ prompt: 'test', size: '256x256' }))
        .rejects.toThrow('Invalid size for dall-e-3');
    });
    
    it('should throw error for n > 1 with DALL-E 3', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      await expect(generateImage({ prompt: 'test', n: 2 }))
        .rejects.toThrow('DALL-E 3 only supports n=1');
    });
    
    it('should throw error for invalid quality', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      await expect(generateImage({ prompt: 'test', quality: 'invalid' }))
        .rejects.toThrow('Invalid quality');
    });
    
    it('should throw error for invalid style', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      await expect(generateImage({ prompt: 'test', style: 'invalid' }))
        .rejects.toThrow('Invalid style');
    });
    
    it('should generate image with DALL-E 3 by default', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          created: 1234567890,
          model: 'dall-e-3',
          data: [{ url: 'https://example.com/image.png', revised_prompt: 'A test image' }]
        })
      });
      
      const result = await generateImage({ prompt: 'A test image' });
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('dall-e-3');
      expect(result.images).toHaveLength(1);
      expect(result.images[0].url).toBe('https://example.com/image.png');
      
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.openai.com/v1/images/generations');
      
      const body = JSON.parse(callArgs[1].body);
      expect(body.model).toBe('dall-e-3');
      expect(body.prompt).toBe('A test image');
    });
    
    it('should generate image with DALL-E 2', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          created: 1234567890,
          model: 'dall-e-2',
          data: [
            { url: 'https://example.com/image1.png' },
            { url: 'https://example.com/image2.png' }
          ]
        })
      });
      
      const result = await generateImage({ 
        prompt: 'A test image', 
        model: 'dall-e-2',
        n: 2,
        size: '512x512'
      });
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('dall-e-2');
      expect(result.images).toHaveLength(2);
    });
    
    it('should handle API errors', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Invalid API key' }
        })
      });
      
      await expect(generateImage({ prompt: 'test' }))
        .rejects.toThrow('Invalid API key');
    });
  });
});
