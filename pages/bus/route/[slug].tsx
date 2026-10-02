import ListingDetail from "@/components/catalog/ListingDetail";
import { getListing, getSlugs, safely } from "@/lib/api";
import { Listing } from "@/typescript/interface/domain.interface";
import { GetStaticPaths, GetStaticProps } from "next";

interface Props {
  listing: Listing;
  related: Listing[];
}

export default function Page({ listing, related }: Props) {
  return <ListingDetail listing={listing} related={related} />;
}

/**
 * Pre-rendered per slug: §11.4 wants these indexable, and a static page is the
 * cheapest thing to serve to a phone on 3G. `blocking` fallback means a listing
 * the admin publishes after the last build still resolves on first request
 * instead of 404ing until the next deploy.
 */
export const getStaticPaths: GetStaticPaths = async () => {
  const { listings } = await safely(() => getSlugs(), { listings: [], hotels: [] });
  return {
    paths: listings
      .filter((l) => l.vertical === "BUS")
      .map((l) => ({ params: { slug: l.slug } })),
    fallback: "blocking"
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  try {
    const { listing, related } = await getListing(String(params?.slug));
    // A slug resolves whatever route asks for it, so a listing of another
    // vertical would otherwise render under this one. Serve only its own.
    if (listing.vertical !== "BUS") return { notFound: true, revalidate: 60 };
    return { props: { listing, related }, revalidate: 300 };
  } catch {
    // Unknown slug, or the API is down mid-build. Either way ISR retries.
    return { notFound: true, revalidate: 60 };
  }
};
