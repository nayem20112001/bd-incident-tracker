def fetch_rss_items(feed_url: str, timeout: int = 25) -> List[Dict[str, str]]:
    import urllib.parse as up

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    }
    r = httpx.get(feed_url, headers=headers, timeout=timeout, follow_redirects=True)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "xml")
    items = soup.find_all(["item", "entry"])
    out = []

    def extract_link(node):
        # 1) atom href, else text of <link>/<id>
        link = ""
        if node.link and node.link.get("href"):
            link = node.link.get("href").strip()
        elif node.link and node.link.text:
            link = node.link.text.strip()
        elif node.id and node.id.text:
            link = node.id.text.strip()

        # 2) Google News unwrapping: prefer url= param if present
        if "news.google." in link:
            parsed = up.urlparse(link)
            qs = up.parse_qs(parsed.query)
            if "url" in qs and qs["url"]:
                link = qs["url"][0]
            else:
                # Fallback: resolve one redirect hop to get publisher URL
                try:
                    head = httpx.head(link, headers=headers, timeout=10, follow_redirects=True)
                    if head.is_redirect:
                        link = str(head.headers.get("location", link))
                    else:
                        link = str(head.url)
                except Exception:
                    pass
        return link

    for it in items:
        title = (it.title.text if it.title else "").strip()
        link = extract_link(it)

        pubdate = ""
        for tag in ("pubDate", "updated", "published"):
            node = it.find(tag)
            if node and node.text:
                pubdate = node.text.strip()
                break

        summary = ""
        for tag in ("description", "summary", "content"):
            node = it.find(tag)
            if node and node.text:
                summary = node.text.strip()
                break

        out.append({"title": title, "link": link, "published": pubdate, "summary": summary})
    return out
