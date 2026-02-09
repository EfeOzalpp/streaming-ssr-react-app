// src/dynamic-app/lib/fetchUser.js
import sanityClient from '../../services/sanity';

export const fetchImages = async (sortOption = 'default') => {
  let orderClause = '';
  switch (sortOption) {
    case 'titleAsc':  orderClause = '| order(title asc)'; break;
    case 'titleDesc': orderClause = '| order(title desc)'; break;
    case 'dateAsc':   orderClause = '| order(_createdAt asc)'; break;
    case 'dateDesc':  orderClause = '| order(_createdAt desc)'; break;
  }

  const query = `*[_type == "imageAsset"] ${orderClause} {
    _id,
    title,
    description,
    // dereference to get real URLs on the server
    image1{ ..., asset->{ url } },
    image2{ ..., asset->{ url } },
    caption1,
    alt1,
    alt2,
    iconName,
    url1
  }`;

  try {
    const data = await sanityClient.fetch(query);
    return data;
  } catch (error) {
    console.error('Error fetching images', error);
    return [];
  }
};
