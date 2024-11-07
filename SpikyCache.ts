// SpikyCache by @spikerko

interface CacheOptions {
  name: string;
}

export class SpikyCache {
  private cacheName: string;

  constructor(options: CacheOptions) {
    this.cacheName = this.normalizeKey(options.name);
  }

  private normalizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9-]/g, "").replace(/\s+/g, "-");
  }

  public async set(
    key: string,
    value: string | number | object | boolean,
    expirationTTL?: number
  ): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    let body: BodyInit | null = null;
    let contentType: string | undefined = undefined;
  
    if (typeof value === "string") {
      body = value;
      contentType = "text/plain";
    } else if (typeof value === "number") {
      body = value.toString();
      contentType = "text/plain";
    } else if (typeof value === "object") {
      body = JSON.stringify(value);
      contentType = "application/json";
    } else if (typeof value === "boolean") {
      body = value.toString();
      contentType = "text/plain";
    }
  
    try {
      const cache = await caches.open(this.cacheName);
  
      let headers: HeadersInit = {};
      if (contentType) {
        headers["Content-Type"] = contentType;
      }
  
      const response = new Response(body, { headers });
  
      if (expirationTTL) {
        response.headers.append("Cache-Control", `max-age=${expirationTTL}`);
      }
      await cache.put(normalizedKey, response);
    } catch (error) {
      console.error("Error setting cache:", error);
      throw error;
    }
  }

  public async get(key: string): Promise<any> {
    const normalizedKey = this.normalizeKey(key);
    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(normalizedKey);
      if (response) {
        const contentType = response.headers.get("Content-Type");
        if (contentType === "application/json") {
          return await response.json();
        } else if (contentType?.startsWith("text/")) {
          // Handle text responses, including numbers, strings, and booleans
          const text = await response.text();
          // Attempt to parse as number if possible
          const num = parseFloat(text);
          if (!isNaN(num)) {
            return num;
          }
          // Check for boolean values
          if (text === "true") {
            return true;
          } else if (text === "false") {
            return false;
          }
          return text;
        } else {
          // Handle other content types as needed
          return await response.blob();
        }
      }
    } catch (error) {
      console.error("Error getting cache:", error);
      throw error;
    }
  }

  public async remove(key: string): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    try {
      const cache = await caches.open(this.cacheName);
      await cache.delete(normalizedKey);
    } catch (error) {
      console.error("Error removing cache:", error);
      throw error;
    }
  }

  public async destroy(): Promise<void> {
    try {
      await caches.delete(this.cacheName);
    } catch (error) {
      console.error("Error destroying cache:", error);
      throw error;
    }
  }
}