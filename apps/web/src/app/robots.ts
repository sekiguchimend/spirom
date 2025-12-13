import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://spirom.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/cart",
        "/checkout/",
        "/account/",
        "/login",
        "/register",
        "/orders/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
