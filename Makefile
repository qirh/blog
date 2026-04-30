.PHONY: all posts pages static index rss sitemap clean serve test

all: posts pages static index rss sitemap

public:
	@mkdir -p public

posts: | public
	@for f in posts/*.md; do \
	  slug=$$(basename "$$f" .md); \
	  pandoc -s -f markdown+lists_without_preceding_blankline-implicit_figures \
	    --template=templates/post.html --syntax-highlighting=pygments \
	    --metadata url="/$$slug" \
	    -o "public/$$slug.html" "$$f"; \
	done

pages: | public
	@for f in pages/*.md; do \
	  slug=$$(basename "$$f" .md); \
	  if grep -qE '^title:' "$$f"; then \
	    pandoc -s -f markdown+lists_without_preceding_blankline-implicit_figures \
	      --template=templates/page.html --metadata url="/$$slug" \
	      -o "public/$$slug.html" "$$f"; \
	  else \
	    title=$$(printf '%s' "$$slug" | awk -F- '{for(i=1;i<=NF;i++){printf "%s%s", (i==1?"":" "), toupper(substr($$i,1,1)) substr($$i,2)}; print ""}'); \
	    pandoc -s -f markdown+lists_without_preceding_blankline-implicit_figures \
	      --template=templates/page.html --metadata title="$$title" --metadata url="/$$slug" \
	      -o "public/$$slug.html" "$$f"; \
	  fi; \
	done

static: | public
	@cp -R static/. public/

index: | public
	@./scripts/build_index.sh > public/index.html

rss: | public
	@./scripts/build_rss.sh > public/rss.xml

sitemap: | public
	@./scripts/build_sitemap.sh > public/sitemap.xml

clean:
	rm -rf public

serve: all
	python3 -m http.server 8000 -d public

test:
	@./scripts/smoke_test.sh
