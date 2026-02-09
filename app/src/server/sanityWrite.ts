// src/server/sanityWrite.ts
import { createClient, type SanityClient } from '@sanity/client'

export const writeClient = createClient({
  projectId: 'uyghamp6',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN, 
}) as SanityClient & {
  create: (doc: any) => Promise<any>
}
