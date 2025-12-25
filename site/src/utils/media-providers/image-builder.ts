// src/utils/image-builder.ts
import imageUrlBuilder from '@sanity/image-url';
import client from '../sanity';

const builder = imageUrlBuilder(client);

// Base builder
export const urlFor = (source: any) => builder.image(source);

// Ultra-low-res (LQIP)
export const getLowResImageUrl = (source: any) =>
  urlFor(source).ignoreImageParams().width(128).height(128).quality(30).auto('format').url();

// Medium
export const getMediumImageUrl = (source: any) =>
  urlFor(source).ignoreImageParams().width(640).height(360).quality(60).auto('format').url();

// High
export const getHighQualityImageUrl = (source: any, width = 1920, quality = 100) =>
  urlFor(source).ignoreImageParams().width(width).quality(quality).auto('format').url();
