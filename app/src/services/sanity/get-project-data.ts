// src/services/sanity/get-project-data.ts
import client from '.';

const queries: Record<string, string> = {
  'data-viz': `*[_type=="mediaBlock" && slug.current=="data-viz"][0]{
    mediaOne{
      alt,
      image,
      video{
        "webmUrl": webm.asset->url,
        "mp4Url": mp4.asset->url,
        poster
      }
    },
    mediaTwo{
      alt,
      image,
      video{
        "webmUrl": webm.asset->url,
        "mp4Url": mp4.asset->url,
        poster
      }
    }
  }`,
  'ice-scoop': `*[_type=="mediaBlock" && slug.current=="ice-scoop"][0]{
    mediaOne{ alt,image,video{ "webmUrl": webm.asset->url, "mp4Url": mp4.asset->url, poster } },
    mediaTwo{ alt,image,video{ "webmUrl": webm.asset->url, "mp4Url": mp4.asset->url, poster } }
  }`,
  'rotary-lamp': `*[_type=="mediaBlock" && title match "Rotary Lamp"][0]{
    mediaOne{ alt, image{asset->{url}}, video{ asset->{url} } },
    mediaTwo{ alt, image{asset->{url}}, video{ asset->{url} } }
  }`,
  'dynamic-frame': `*[_type == "svgAsset" && title in ["Laptop","Tablet","Phone"]]{
    title, file{ asset->{ url } }
  }`,
  'rock-coin': `*[_type=="imageDemanded" && title=="coin"][0]{
    alt,
    image{ asset->{ url } } 
  }`,
};

export async function getProjectData<T>(key: string): Promise<T | null> {
  const q = queries[key];
  if (!q) return null;
  try {
    return await client.fetch<T>(q);
  } catch (e) {
    console.error(`[getProjectData] ${key} failed:`, e);
    return null;
  }
}
