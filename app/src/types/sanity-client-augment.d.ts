import '@sanity/client';

declare module '@sanity/client' {
  interface SanityClient {
    fetch<T = unknown>(
      query: string,
      params?: Record<string, any>
    ): Promise<T>;
  }
}

export {};
