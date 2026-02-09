// src/services/media/image-builder.ts
import imageUrlBuilder from '@sanity/image-url';
import client from '../sanity';

const builder = imageUrlBuilder(client);

// Base builder
export const urlFor = (source: any) => builder.image(source);

// Ultra-low-res (LQIP)
export const getLowResImageUrl = (source: any, width = 128, quality = 30) =>
  urlFor(source).ignoreImageParams().width(width).height(width).quality(quality).auto('format').url();

// Medium
export const getMediumImageUrl = (source: any, width = 960, quality = 60) =>
  urlFor(source).ignoreImageParams().width(width).quality(quality).auto('format').url();

// High
export const getHighQualityImageUrl = (source: any, width = 2400, quality = 90) =>
  urlFor(source).ignoreImageParams().width(width).quality(quality).auto('format').url();
