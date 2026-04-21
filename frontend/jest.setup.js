// Add global fetch and Request/Response mocks for Next.js API tests
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = init.headers || {};
      this.body = init.body;
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...init.headers },
      });
    }
    constructor(body = null, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = init.headers || {};
    }
  };
}

if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}

// Mock jsPDF for testing
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    text: jest.fn(),
    splitTextToSize: jest.fn().mockImplementation((text) => [text]),
    addPage: jest.fn(),
    output: jest.fn().mockReturnValue(new ArrayBuffer()),
    internal: {
      get: jest.fn().mockReturnValue({
        pageSize: {
          getWidth: jest.fn().mockReturnValue(595),
          getHeight: jest.fn().mockReturnValue(842),
        },
      }),
    },
  }));
});

jest.mock('jspdf-autotable', () => jest.fn());
