.PHONY: all posts pages static index rss clean serve

all: posts pages static index rss

public:
	@mkdir -p public

posts: | public
	@for f in posts/*.md; do \
	  slug=$$(basename "$$f" .md); \
	  pandoc -s -f markdown+lists_without_preceding_blankline \
	    --template=templates/post.html --syntax-highlighting=pygments \
	    -o "public/$$slug.html" "$$f"; \
	done

pages: | public
	@for f in pages/*.md; do \
	  slug=$$(basename "$$f" .md); \
	  title=$$(printf '%s' "$$slug" | awk '{print toupper(substr($$0,1,1)) substr($$0,2)}'); \
	  pandoc -s -f markdown+lists_without_preceding_blankline \
	    --template=templates/page.html --metadata title="$$title" \
	    -o "public/$$slug.html" "$$f"; \
	done

static: | public
	@cp -R static/. public/

index: | public
	@./scripts/build_index.sh > public/index.html

rss: | public
	@./scripts/build_rss.sh > public/rss.xml

clean:
	rm -rf public

serve: all
	python3 -m http.server 8000 -d public
